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

  private async chat(body: Record<string, unknown>, retries = 2): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, ...body }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("Muse returned no content");
        return content;
      }
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
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
        reasoning_effort: "low",
      });
      return validateAnalysis(JSON.parse(content));
    };
    const urls = (post.imageUrls ?? []).slice(0, 4);
    try {
      return await run(urls);
    } catch (e) {
      if (!urls.length || !/media_url|download media/.test((e as Error).message)) throw e;
    }
    // Muse could not fetch a URL: inline what we can download, drop the rest.
    const inlined = (await Promise.all(urls.map((u) => this.inlineImage(u)))).filter((x): x is string => !!x);
    try {
      return await run(inlined);
    } catch {
      return run([]); // text-only beats the mock fallback
    }
  }
}
