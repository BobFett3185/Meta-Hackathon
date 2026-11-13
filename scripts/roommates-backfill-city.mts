// One-off repair: copy each profile's city from the shared ingestion's analysis (no Muse calls).
//   npm run roommates:backfill-city
import { adminDb, check } from "../services/ingestion/db";
const db = adminDb();
const profiles: any[] = check(await db.from("roommate_profiles").select("id,city,source_post_id").not("source_post_id", "is", null), "profiles");
const analyses = new Map<string, any>();
for (let i = 0; i < profiles.length; i += 100)
  for (const r of check(await db.from("nest_ingested_posts").select("post_id,analysis").in("post_id", profiles.slice(i, i + 100).map((p) => p.source_post_id)), "analysis") as any[])
    analyses.set(r.post_id, r.analysis);
let changed = 0;
for (const p of profiles) {
  const city = analyses.get(p.source_post_id)?.housing?.city ?? null;
  if (city && city !== p.city) { check(await db.from("roommate_profiles").update({ city }).eq("id", p.id), "update"); changed++; }
}
console.log(`${changed} of ${profiles.length} profiles got a city from the shared ingestion.`);
process.exit(0);
