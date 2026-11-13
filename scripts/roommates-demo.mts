// Shows roommate matching for one person.
//   npm run roommates:demo                    picks someone with several workable matches
//   npm run roommates:demo -- --name=Evan     first profile whose name contains "Evan"
//   add --no-muse to skip the Muse explanations (rule-based summary only)
import { adminDb, check } from "../services/ingestion/db";
import { findMatches } from "../services/roommates/match";
import type { RoommateProfile } from "../services/roommates/types";

const args = process.argv.slice(2);
const nameArg = args.find((a) => a.startsWith("--name="))?.split("=")[1]?.toLowerCase();
const useMuse = !args.includes("--no-muse");

const rows: any[] = check(await adminDb().from("roommate_profiles").select("*, user:fb_users(name)").eq("opted_in", true), "read profiles");
const profiles: RoommateProfile[] = rows.map((r) => ({ ...r, name: r.user?.name ?? "Unknown" }));
if (!profiles.length) { console.log("No profiles yet. Run: npm run roommates -- --write"); process.exit(0); }

const pickBest = async () => {
  let best: { p: RoommateProfile; n: number } | null = null;
  for (const p of profiles) {
    const n = (await findMatches(p, profiles, { limit: 50, useMuse: false })).length;
    if (!best || n > best.n) best = { p, n };
  }
  return best!.p;
};
const me = nameArg ? profiles.find((p) => p.name.toLowerCase().includes(nameArg)) : await pickBest();
if (!me) { console.log(`No profile matching "${nameArg}"`); process.exit(0); }

const bar = "─".repeat(64);
console.log(`\n${bar}\nYOU: ${me.name}  [${me.seeking === "has_room" ? "has a room" : "needs a room"}]`);
console.log(`  budget $${me.budget_amount ?? "?"}/${me.budget_basis} · ${me.areas.join(", ") || "no area"} · ${me.move_in ?? "?"} → ${me.move_out ?? "?"}`);
console.log(`  sleep=${me.sleep_schedule} clean=${me.cleanliness} pets=${me.pets} social=${me.social_style} · ${me.occupation_or_school ?? "-"}`);
console.log(`  traits: ${me.other_traits.join("; ") || "-"}`);
console.log(`  from your post: "${me.evidence[0] ?? ""}"\n${bar}`);

console.log(`Comparing against ${profiles.length - 1} other roommate profiles...\n`);
const matches = await findMatches(me, profiles, { limit: 5, explainTop: 3, useMuse });
if (!matches.length) console.log("No workable matches (everyone has a budget, date or area conflict).");
const icon = { matched: "✓", conflict: "✗", unknown: "?" } as const;
matches.forEach((m, i) => {
  console.log(`#${i + 1} ${m.profile.name}  [${m.kind === "household" ? "could look for a place together" : "fills a room"}]  · ${m.conflicts} conflict(s)`);
  for (const c of m.criteria) console.log(`   ${icon[c.status]} ${c.label.padEnd(30)} ${c.evidence}`);
  m.explanation.traits.forEach((t) => console.log(`   ~ ${t.topic}: ${t.status} - ${t.note}`));
  console.log(`   → (${m.explanation.by}) ${m.explanation.summary}\n`);
});
const all = (await findMatches(me, profiles, { limit: 1000, useMuse: false })).length;
console.log(`${all} of ${profiles.length - 1} profiles had no hard conflict with ${me.name}.`);
