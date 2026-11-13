// Builds roommate_profiles from posts the shared ingestion already classified as `roommate_request`.
// Reads nest_ingested_posts + fb_posts; never touches the ingestion tables.
import { adminDb, check } from "../ingestion/db";
import { extractProfile, type ExtractResult } from "./extract";
import type { ProfileFields } from "./types";

export interface BuildOptions { write?: boolean; reprocess?: boolean; limit?: number; concurrency?: number; onResult?: (r: BuildRow) => void }
export interface BuildRow { postId: string; label: string; result: ExtractResult }
export interface BuildSummary { candidates: number; accepted: number; skipped: number; transientFailures: number; written: number; rows: BuildRow[] }

async function mapLimit<T, R>(xs: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(xs.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, xs.length) }, async () => {
    while (i < xs.length) { const k = i++; out[k] = await fn(xs[k]); }
  }));
  return out;
}

export async function buildRoommateProfiles({ write = false, reprocess = false, limit = Infinity, concurrency = 3, onResult }: BuildOptions = {}): Promise<BuildSummary> {
  const db = adminDb();
  // 1. posts the classifier labelled roommate_request (non-duplicates)
  const classified: any[] = check(await db.from("nest_ingested_posts").select("post_id")
    .eq("category", "roommate_request").is("duplicate_of", null), "read ingested");
  const ids = classified.map((r) => r.post_id);
  if (!ids.length) return { candidates: 0, accepted: 0, skipped: 0, transientFailures: 0, written: 0, rows: [] };

  // 2. skip posts that already have a profile (idempotent re-runs), unless reprocessing
  let done = new Set<string>();
  if (!reprocess && write) {
    const existing: any[] = check(await db.from("roommate_profiles").select("source_post_id").not("source_post_id", "is", null), "read profiles");
    done = new Set(existing.map((r) => r.source_post_id));
  }
  const todoIds = ids.filter((id) => !done.has(id)).slice(0, limit);
  const posts: any[] = [];
  for (let i = 0; i < todoIds.length; i += 100)
    posts.push(...check(await db.from("fb_posts").select("id,title,body,author_id,group_id,created_at").in("id", todoIds.slice(i, i + 100)), "read posts"));

  // 3. extract + gate (Muse); transient failures are reported, not saved, so a re-run picks them up
  const rows = await mapLimit(posts, concurrency, async (p): Promise<BuildRow & { post: any }> => {
    const text = [p.title, p.body].filter(Boolean).join("\n");
    const row = { postId: p.id, label: text.slice(0, 70).replace(/\n/g, " "), result: await extractProfile(text, new Date(p.created_at)), post: p };
    onResult?.(row);
    return row;
  });

  const accepted = rows.filter((r): r is typeof r & { result: { ok: true; profile: ProfileFields } } => r.result.ok);
  let written = 0;
  if (write && accepted.length) {
    const postIds = accepted.map((r) => r.postId);
    check(await db.from("roommate_profiles").delete().in("source_post_id", postIds), "reset profiles");
    const data = accepted.map((r) => ({
      ...r.result.profile, user_id: r.post.author_id, source: "post", source_post_id: r.post.id, source_group_id: r.post.group_id,
      original_text: [r.post.title, r.post.body].filter(Boolean).join("\n"), extracted_by: "muse",
    }));
    check(await db.from("roommate_profiles").insert(data), "write profiles");
    written = data.length;
  }
  return {
    candidates: posts.length, accepted: accepted.length, written,
    skipped: rows.filter((r) => !r.result.ok && !r.result.retry).length,
    transientFailures: rows.filter((r) => !r.result.ok && r.result.retry).length,
    rows: rows.map(({ post, ...r }) => r),
  };
}
