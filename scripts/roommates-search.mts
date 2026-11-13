// Runs the same roommate search the app triggers, against the saved profiles, and prints the results.
//   npm run roommates:search
import { searchRoommates } from "../services/roommates/search";

const goal = {
  intent: "Both", city: "Seattle", preferredNeighborhoods: ["South Lake Union"], startDate: "2027-06-01", endDate: "2027-08-31",
  budgetAmount: 1500, budgetBasis: "person", alreadyHasHome: false, preferences: ["Quiet home"], sourceIds: [],
};
const t = Date.now();
const out = await searchRoommates(goal);
console.log(`Goal: ${goal.city} · ${goal.preferredNeighborhoods.join(", ")} · $${goal.budgetAmount}/person · ${goal.startDate} → ${goal.endDate}`);
console.log(`${out.length} matches in ${Date.now() - t}ms\n`);
for (const m of out) {
  console.log(`${m.name} — ${m.introduction}  [${m.pairing}] $${m.budgetPerPerson} · ${m.preferredAreas.join(", ")} · ${m.dates.join(" → ")}`);
  console.log("  " + m.criteria.map((c: any) => `${c.status === "matched" ? "yes" : c.status === "unknown" ? "?" : "NO"}:${c.label}`).join(" | "));
  console.log(`  (${m.matchSummaryBy}) ${m.matchSummary}\n`);
}
