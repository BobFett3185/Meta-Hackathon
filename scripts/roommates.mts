// Build roommate profiles from classified roommate_request posts.
//   npm run roommates                    dry run: shows who would get a profile and why others don't
//   npm run roommates -- --write         save to roommate_profiles (run supabase/roommates.sql first)
//   --limit=N   only N posts      --reprocess   redo posts that already have a profile
import { buildRoommateProfiles } from "../services/roommates/build";

const args = process.argv.slice(2);
const write = args.includes("--write");
const limit = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? Infinity);
const summary = await buildRoommateProfiles({ write, reprocess: args.includes("--reprocess"), limit });

for (const { label, result } of summary.rows) {
  if (result.ok) {
    const p = result.profile;
    console.log(`+ [${p.seeking}] ${label}`);
    console.log(`    $${p.budget_amount ?? "?"}/${p.budget_basis} · ${p.areas.join(", ") || "no area"} · ${p.move_in ?? "?"} → ${p.move_out ?? "?"}`);
    console.log(`    sleep=${p.sleep_schedule} clean=${p.cleanliness} smoke=${p.smoking} pets=${p.pets} social=${p.social_style} · ${p.occupation_or_school ?? "-"} · ${p.other_traits.join("; ") || "-"}`);
  } else console.log(`- ${label}  → ${result.reason}${result.retry ? "  (will retry next run)" : ""}`);
}
console.log(`\n${summary.candidates} roommate posts · ${summary.accepted} profiles · ${summary.skipped} skipped · ${summary.transientFailures} to retry` +
  (write ? ` · ${summary.written} saved` : " · dry run (add --write to save)"));
