import type { AIService, PostAnalysis, RawPostInput } from "./types";
import { ANALYSIS_SCHEMA, SYSTEM_PROMPT } from "./prompts";
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

  async analyzePost(post: RawPostInput): Promise<PostAnalysis> {
    const parts: unknown[] = [
      { type: "text", text: `${post.communityName ? `Group: ${post.communityName}\n` : ""}Post:\n"""\n${post.content}\n"""` },
      ...(post.imageUrls ?? []).slice(0, 4).map((url) => ({ type: "image_url", image_url: { url } })),
    ];
    const content = await this.chat({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: parts },
      ],
      response_format: { type: "json_schema", json_schema: { name: "PostAnalysis", schema: ANALYSIS_SCHEMA } },
      reasoning_effort: "low",
    });
    return validateAnalysis(JSON.parse(content));
  }
}
