// Matches a SearchGoal against everything Muse extracted from the groups, read live from Supabase.
// @ts-ignore plain JS module shared with the Expo client (single source of matching truth)
import { matchHomes } from "../src/nest/matching.js";
import { adminDb, check } from "../services/ingestion/db";
import { runIngestion } from "../services/ingestion/run";
import { searchRoommates } from "../services/roommates/search";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadData() {
  const db = adminDb();
  const [l, r, t] = await Promise.all([
    db.from("nest_listings").select("listing").order("created_at"),
    db.from("nest_roommates").select("profile").order("created_at"),
    db.from("nest_ingested_posts").select("analyzed_at").order("analyzed_at", { ascending: false }).limit(1),
  ]);
  return {
    listings: check(l, "read nest_listings").map((x: any) => x.listing),
    roommates: check(r, "read nest_roommates").map((x: any) => x.profile),
    generatedAt: check(t, "read ingested")[0]?.analyzed_at ?? null,
  };
}

const same = (a?: string | null, b?: string | null) => (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

function roommateMatches(roommates: any[], goal: any) {
  if (goal.intent === "Home") return [];
  return roommates
    .filter((p) => goal.sourceIds.includes(p.sourceId) && goal.budgetBasis === "person" && p.budgetPerPerson <= goal.budgetAmount
      && p.dates[0] && p.dates[1] && p.dates[0] <= goal.startDate && p.dates[1] >= goal.endDate
      && same(p.city, goal.city)
      && (!goal.preferredNeighborhoods.length || p.preferredAreas.some((a: string) => goal.preferredNeighborhoods.some((n: string) => same(n, a)))))
    .map((p) => ({
      ...p,
      criteria: [
        { criterionId: "dates", label: "Your dates overlap", explanation: "The stated dates cover your stay", status: "matched", evidence: `${p.dates[0]} to ${p.dates[1]}` },
        { criterionId: "budget", label: "Similar housing budget", explanation: "Their per-person budget is within yours", status: "matched", evidence: `$${p.budgetPerPerson} per person` },
        { criterionId: "area", label: "Same area", explanation: "They are looking where you are", status: "matched", evidence: p.preferredAreas.join(", ") || p.city },
        ...goal.preferences.map((pref: string, i: number) => {
          const hit = p.explicitLivingPreferences.some((x: string) => x.toLowerCase().includes(pref.toLowerCase().replace(/ (home|roommate)$/, "")));
          return { criterionId: `pref-${i}`, label: `Also prefers: ${pref}`, explanation: "Only matched when their post says so",
            status: hit ? "matched" : "unknown", evidence: hit ? "Their original post says so" : "Not stated in their post" };
        }),
      ],
    }));
}

export interface QueryLog {
  userId?: string; kind: "interpret" | "search"; raw: string; goal?: unknown; via?: string; missing?: string | null; homes?: number; roommates?: number;
}
/** Persist what users type + what Muse understood. Never blocks or breaks the request. */
export async function logQuery(q: QueryLog) {
  try {
    check(await adminDb().from("nest_user_queries").insert({
      user_id: q.userId && UUID.test(q.userId) ? q.userId : null, kind: q.kind, raw_query: q.raw, goal: q.goal ?? null,
      interpreted_via: q.via ?? null, missing: q.missing ?? null, home_count: q.homes ?? null, roommate_count: q.roommates ?? null,
    }), "log query");
  } catch (e) { console.warn("[query-log]", (e as Error).message); }
}

/** Pick up posts made moments ago before answering. Bounded so a slow Muse call never hangs a search. */
async function ensureFresh(ms = 12_000) {
  try { await Promise.race([runIngestion({ limit: 5 }), new Promise((ok) => setTimeout(ok, ms))]); }
  catch (e) { console.warn("[fresh]", (e as Error).message); }
}

export async function search(goal: any, query?: string, userId?: string) {
  await ensureFresh();
  const d = await loadData();
  const homes = goal.intent === "Roommate" && goal.alreadyHasHome === false ? [] : matchHomes(d.listings, goal);
  // Roommate matching lives in services/roommates; falls back to the simple filter if roommate_profiles is unavailable.
  const roommates = await searchRoommates(goal).catch((e) => { console.warn("[roommates]", (e as Error).message); return roommateMatches(d.roommates, goal); });
  void logQuery({ userId, kind: "search", raw: query ?? goal.rawPrompt ?? "", goal, homes: homes.length, roommates: roommates.length });
  return { generatedAt: d.generatedAt, homes, roommates, considered: { listings: d.listings.length, roommates: d.roommates.length } };
}
