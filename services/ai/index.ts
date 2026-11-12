import type { AIService, PostAnalysis, RawPostInput } from "./types";
import { MuseAI } from "./muse";
import { MockAI } from "./mock-ai";

export * from "./types";
export { findDuplicate, isLikelyDuplicate, dedupeKey } from "./dedupe";
export { validateAnalysis } from "./validate";

/** Muse when a key is configured (and not forced to mock), otherwise the mock adapter. */
export function getAI(): AIService {
  const key = process.env.MUSE_API_KEY;
  if (process.env.AI_PROVIDER !== "mock" && key) {
    return new MuseAI(key, process.env.MUSE_BASE_URL, process.env.MUSE_MODEL);
  }
  return new MockAI();
}

/** Analyze with Muse; if the call or validation fails, fall back to the mock so ingestion never blocks. */
export async function analyzePost(post: RawPostInput): Promise<PostAnalysis & { provider: "muse" | "mock" }> {
  const ai = getAI();
  try {
    return { ...(await ai.analyzePost(post)), provider: ai.provider };
  } catch (err) {
    if (ai.provider === "mock") throw err;
    console.warn(`[ai] Muse failed for post ${post.id}, using mock:`, (err as Error).message);
    return { ...(await new MockAI().analyzePost(post)), provider: "mock" };
  }
}
