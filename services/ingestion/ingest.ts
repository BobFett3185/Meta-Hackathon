import { analyzePost, findDuplicate, type HousingExtraction, type ItemExtraction, type PostCategory, type RawPostInput } from "../ai";

export interface IngestPost extends RawPostInput {
  authorId?: string;
  communityId?: string;
  authorName?: string;
  authorAvatar?: string;
  originalPostUrl?: string;
}

export interface IngestedPost {
  rawPostId: string;                 // source reference, always preserved
  category: PostCategory;
  confidence: number;
  provider: "muse" | "mock";
  housing: HousingExtraction | null;
  item: ItemExtraction | null;
  summary: string;
  duplicateOf: string | null;        // rawPostId of the earlier post this repeats
  needsReview: boolean;              // low confidence or key fields missing
}

export interface IngestResult {
  posts: IngestedPost[];
  listings: IngestedPost[];          // housing posts that are not duplicates
  items: IngestedPost[];
  failed: { rawPostId: string; error: string }[];
}

async function mapLimit<T, R>(xs: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(xs.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, xs.length) }, async () => {
    while (i < xs.length) { const k = i++; out[k] = await fn(xs[k]); }
  }));
  return out;
}

/**
 * Analyze posts, then dedupe housing against `known` (already-stored listings)
 * and earlier posts in this batch. Oldest-first order is assumed so the original wins.
 * Duplicates are kept (flagged), not dropped, so the source post is never lost.
 */
export async function ingestPosts(
  input: IngestPost[],
  known: { rawPostId: string; housing: HousingExtraction; text: string; authorId?: string }[] = [],
  concurrency = 8,
  onProgress?: (done: number, total: number) => void,
): Promise<IngestResult> {
  const failed: IngestResult["failed"] = [];
  let done = 0;
  const analyzed = await mapLimit(input, concurrency, async (p) => {
    try { return { p, a: await analyzePost(p) }; }
    catch (e) { failed.push({ rawPostId: p.id, error: (e as Error).message }); return null; }
    finally { onProgress?.(++done, input.length); }
  });

  const seen = [...known];
  const posts: IngestedPost[] = [];
  for (const r of analyzed) {
    if (!r) continue;
    const { p, a } = r;
    let duplicateOf: string | null = null;
    if (a.housing) {
      const idx = findDuplicate({ housing: a.housing, text: p.content, authorId: p.authorId }, seen);
      if (idx >= 0) duplicateOf = seen[idx].rawPostId;
      else seen.push({ rawPostId: p.id, housing: a.housing, text: p.content, authorId: p.authorId });
    }
    const keyMissing = a.housing ? a.housing.rent == null || a.housing.location == null : false;
    posts.push({
      rawPostId: p.id, category: a.category, confidence: a.confidence, provider: a.provider,
      housing: a.housing, item: a.item, summary: a.summary, duplicateOf,
      needsReview: a.confidence < 0.6 || keyMissing,
    });
  }
  return {
    posts,
    listings: posts.filter((x) => x.housing && !x.duplicateOf),
    items: posts.filter((x) => x.item),
    failed,
  };
}
