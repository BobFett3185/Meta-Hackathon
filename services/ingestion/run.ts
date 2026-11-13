import { adminDb, check } from "./db";
import { getAI } from "../ai";
import { ingestPosts, type IngestPost } from "./ingest";
import { toHomeListing } from "./to-listing";
import { toRoommate } from "./to-roommate";

export interface IngestSummary {
  scanned: number; new: number; analyzed: number; failed: number; duplicates: number;
  listings: number; roommates: number; needsReview: number; seconds: number;
}

const toDate = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
const chunk = <T,>(xs: T[], n = 200) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

let running: Promise<IngestSummary> | null = null;
let rerun = false;

/** Single-flight: if a run is in progress, queue exactly one more after it (covers bursts of webhooks). */
export function runIngestion(opts: { reprocess?: boolean; limit?: number; onProgress?: (done: number, total: number) => void } = {}): Promise<IngestSummary> {
  if (running) { rerun = true; return running; }
  running = ingestOnce(opts).finally(async () => {
    running = null;
    if (rerun) { rerun = false; runIngestion().catch((e) => console.warn("[ingest] queued run failed:", e.message)); }
  });
  return running;
}

async function ingestOnce({ reprocess = false, limit = 100, onProgress }: { reprocess?: boolean; limit?: number; onProgress?: (d: number, t: number) => void } = {}): Promise<IngestSummary> {
  const t0 = Date.now();
  const db = adminDb();
  if (reprocess) {
    for (const t of ["nest_listings", "nest_roommates", "nest_ingested_posts"]) check(await db.from(t).delete().not("post_id", "is", null), `clear ${t}`);
  }
  const rows: any[] = check(await db.from("fb_posts")
    .select("id,title,body,author_id,created_at,group:fb_groups(id,name),author:fb_users!author_id(name,avatar_url),images:fb_post_images(url,position)")
    .order("created_at"), "read fb_posts");
  // Posts answered by the mock only because Muse failed are NOT done: retry them while Muse is configured.
  const museOn = getAI().provider === "muse";
  const seen = new Set<string>(check(await db.from("nest_ingested_posts").select("post_id,provider"), "read ingested")
    .filter((r: any) => !museOn || r.provider === "muse").map((r: any) => r.post_id));
  const posts: IngestPost[] = rows.map((p) => ({
    id: p.id, authorId: p.author_id, authorName: p.author?.name, authorAvatar: p.author?.avatar_url,
    communityId: p.group?.id ?? undefined, communityName: p.group?.name ?? undefined, content: [p.title, p.body].filter(Boolean).join("\n"),
    imageUrls: (p.images ?? []).sort((a: any, b: any) => a.position - b.position).map((i: any) => i.url),
  }));
  const byId = new Map(posts.map((p) => [p.id, p]));
  // Housing-looking groups first so listings appear soonest. Ordering only: nothing is excluded.
  const hot = (p: IngestPost) => (/(hous|sublet|roommate|rent|lease|intern)/i.test(p.communityName ?? "") ? 0 : 1);
  const todo = posts.filter((p) => !seen.has(p.id)).sort((a, b) => hot(a) - hot(b)).slice(0, limit);
  const empty = { scanned: posts.length, new: 0, analyzed: 0, failed: 0, duplicates: 0, listings: 0, roommates: 0, needsReview: 0, seconds: 0 };
  if (!todo.length) return empty;

  // Dedupe against listings already stored, not just this batch.
  const prior: any[] = check(await db.from("nest_ingested_posts").select("post_id,analysis,duplicate_of"), "read prior");
  const known = prior.filter((r) => r.analysis?.housing && !r.duplicate_of && byId.has(r.post_id))
    .map((r) => ({ rawPostId: r.post_id, housing: r.analysis.housing, text: byId.get(r.post_id)!.content, authorId: byId.get(r.post_id)!.authorId }));

  const total = { new: todo.length, analyzed: 0, failed: 0, duplicates: 0, listings: 0, roommates: 0, needsReview: 0 };
  const BATCH = 24;
  let done = 0;
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const result = await ingestPosts(batch, known, 8, (d) => onProgress?.(done + d, todo.length));
    done += batch.length;

    const ingested = result.posts.map((r) => ({
      post_id: r.rawPostId, category: r.category, confidence: r.confidence, provider: r.provider,
      duplicate_of: r.duplicateOf, needs_review: r.needsReview,
      analysis: { category: r.category, confidence: r.confidence, summary: r.summary, housing: r.housing, item: r.item },
    }));
    const listings = result.posts.flatMap((r) => {
      if (r.duplicateOf) return [];
      const l = toHomeListing(byId.get(r.rawPostId)!, r);
      return l ? [{ post_id: r.rawPostId, city: l.city, neighborhood: l.neighborhood, monthly_rent: l.monthlyRent, rent_basis: l.rentBasis,
        source_id: l.sourceId, available_from: toDate(l.availableFrom), available_to: toDate(l.availableTo), listing: l }] : [];
    });
    const roommates = result.posts.flatMap((r) => {
      const p = toRoommate(byId.get(r.rawPostId)!, r);
      return p ? [{ post_id: r.rawPostId, author_id: byId.get(r.rawPostId)!.authorId ?? null, budget: p.budgetPerPerson, city: p.city, source_id: p.sourceId, profile: p }] : [];
    });

    // Save this batch now: a crash or dropped connection later never loses it. Re-analysed posts replace old rows.
    const ids = batch.map((p) => p.id);
    for (const t of ["nest_listings", "nest_roommates"]) await retry(async () => check(await db.from(t).delete().in("post_id", ids), `reset ${t}`));
    for (const [table, data] of [["nest_ingested_posts", ingested], ["nest_listings", listings], ["nest_roommates", roommates]] as const)
      for (const c of chunk(data as any[])) await retry(async () => check(await db.from(table).upsert(c), `write ${table}`));

    // Later batches dedupe against everything saved so far.
    for (const r of result.posts) if (r.housing && !r.duplicateOf) known.push({ rawPostId: r.rawPostId, housing: r.housing, text: byId.get(r.rawPostId)!.content, authorId: byId.get(r.rawPostId)!.authorId });
    total.analyzed += result.posts.length; total.failed += result.failed.length;
    total.duplicates += result.posts.filter((p) => p.duplicateOf).length; total.listings += listings.length; total.roommates += roommates.length;
    total.needsReview += result.posts.filter((p) => p.needsReview).length;
  }
  return { scanned: posts.length, ...total, seconds: Math.round((Date.now() - t0) / 100) / 10 };
}

/** Retry transient network/database errors (fetch failed, timeouts) a few times before giving up. */
async function retry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (i >= tries - 1 || !/fetch failed|timeout|ECONN|ENOTFOUND|network|50\d/i.test((e as Error).message)) throw e;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** i));
    }
  }
}
