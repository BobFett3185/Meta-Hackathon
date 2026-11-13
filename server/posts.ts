import { adminDb, check } from "../services/ingestion/db";
import { runIngestion } from "../services/ingestion/run";

const ME = "Dhweya Modi";
interface NewPost { content: string; title?: string; group?: string; author?: string; imageUrls?: string[] }

/** Insert a mock Facebook post, then ingest it immediately and report what Nest extracted. */
export async function createPost(p: NewPost) {
  if (!p.content?.trim()) throw new Error("content is required");
  const db = adminDb();
  const [users, groups]: any[] = await Promise.all([
    db.from("fb_users").select("id,name").then((r) => check(r, "read users")),
    db.from("fb_groups").select("id,name").then((r) => check(r, "read groups")),
  ]);
  const find = (xs: any[], q?: string) => (q ? xs.find((x) => x.name.toLowerCase().includes(q.toLowerCase())) : undefined);
  const author = find(users, p.author) ?? find(users, ME);
  const group = find(groups, p.group);
  if (p.group && !group) throw new Error(`No group matching "${p.group}"`);
  const post = check(await db.from("fb_posts").insert({ author_id: author.id, group_id: group?.id ?? null, title: p.title ?? null, body: p.content }).select("id").single(), "insert post");
  if (p.imageUrls?.length) check(await db.from("fb_post_images").insert(p.imageUrls.map((url, position) => ({ post_id: post.id, url, position }))), "insert images");
  const summary = await runIngestion();
  const listing = check(await db.from("nest_listings").select("listing").eq("post_id", post.id).maybeSingle(), "read listing");
  const analysis = check(await db.from("nest_ingested_posts").select("category,confidence,duplicate_of").eq("post_id", post.id).maybeSingle(), "read analysis");
  return { postId: post.id, author: author.name, group: group?.name ?? null, ingest: summary, analysis, listing: listing?.listing ?? null };
}
