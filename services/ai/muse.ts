import type { AIService, PostAnalysis, RawPostInput } from "./types";
import { ANALYSIS_SCHEMA, systemPrompt } from "./prompts";
import { validateAnalysis } from "./validate";

// Meta Model API, OpenAI-compatible Chat Completions: https://dev.meta.ai/docs/features/chat-completion
// Server-side only. The key must never reach the browser.
export class MuseAI implements AIService {
  readonly provider = "muse" as const;
  constructor(
    private apiKey: string,
    private baseUrl = "https://api.meta.ai/v1",
    private model = "muse-spark-1.3",
  ) {}

  private async chat(body: Record<string, unknown>, retries = 6): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: this.model, ...body }),
          signal: AbortSignal.timeout(90_000),
        });
      } catch (e) {
        // Network blip or timeout: retry with backoff instead of failing the post.
        if (attempt < retries) { await new Promise((r) => setTimeout(r, Math.min(30_000, 2000 * 2 ** attempt) + Math.random() * 1000)); continue; }
        throw new Error(`Muse unreachable: ${(e as Error).message}`);
      }
      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("Muse returned no content");
        return content;
      }
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        // Shared capacity limit: back off with jitter, honouring Retry-After when given.
        const wait = Number(res.headers.get("retry-after")) * 1000 || Math.min(30_000, 2000 * 2 ** attempt);
        await new Promise((r) => setTimeout(r, wait + Math.random() * 1000));
        continue;
      }
      throw new Error(`Muse API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
  }

  async completeJSON<T = unknown>({ system, user, schema, name }: { system: string; user: string; schema: object; name: string }): Promise<T> {
    const content = await this.chat({
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_schema", json_schema: { name, schema } },
      reasoning_effort: "low",
    });
    return JSON.parse(content) as T;
  }

  /** Download an image ourselves and inline it, for hosts Muse cannot fetch (robots.txt, hotlink blocks). */
  private async inlineImage(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "NestBot/0.1" } });
      const type = res.headers.get("content-type")?.split(";")[0] ?? "";
      if (!res.ok || !/^image\/(png|jpeg|webp|gif)$/.test(type)) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 4_000_000) return null;
      return `data:${type};base64,${buf.toString("base64")}`;
    } catch { return null; }
  }

  async analyzePost(post: RawPostInput): Promise<PostAnalysis> {
    const text = { type: "text", text: `${post.communityName ? `Group: ${post.communityName}\n` : ""}Post:\n"""\n${post.content}\n"""` };
    const run = async (images: string[]) => {
      const content = await this.chat({
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: [text, ...images.map((url) => ({ type: "image_url", image_url: { url } }))] },
        ],
        response_format: { type: "json_schema", json_schema: { name: "PostAnalysis", schema: ANALYSIS_SCHEMA } },
        reasoning_effort: "minimal",
      });
      return validateAnalysis(JSON.parse(content));
    };
    // Pass 1: text only (fast). Most posts are fully understood from their text.
    const first = await run([]);
    const urls = (post.imageUrls ?? []).slice(0, 3);
    const h = first.housing, it = first.item;
    const gaps = h ? [h.rent, h.city, h.location, h.bedrooms].some((v) => v == null) : it ? [it.price, it.title].some((v) => v == null) : false;
    if (!urls.length || !gaps) return first;
    // Pass 2: a listing/item with blanks and photos. Let Muse look at the images to fill gaps (never overrides text facts).
    try {
      const inlined = (await Promise.all(urls.map((u) => this.inlineImage(u)))).filter((x): x is string => !!x);
      if (!inlined.length) return first;
      const second = await run(inlined);
      return mergeFill(first, second);
    } catch {
      return first;
    }
  }
}

/** Keep everything pass 1 found; only fill fields it left empty from the image-assisted pass. */
function mergeFill(a: PostAnalysis, b: PostAnalysis): PostAnalysis {
  const fill = <T extends object>(x: T | null, y: T | null): T | null =>
    x && y ? (Object.fromEntries(Object.entries(x).map(([k, v]) => [k, v === null || (Array.isArray(v) && !v.length) ? (y as any)[k] ?? v : v])) as T) : x ?? y;
  return { ...a, housing: fill(a.housing, b.housing), item: fill(a.item, b.item) };
}
