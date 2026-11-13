// Bridges the app's search goal to roommate matching, returning the exact shape the Nest UI already renders
// (src/nest/types.d.ts RoommateMatch). Reads roommate_profiles; the app never sees raw rows.
import { adminDb, check } from "../ingestion/db";
import { evaluatePair, explain, plainSummary, type Explanation } from "./match";
import type { Criterion, RoommateProfile } from "./types";

// Muse-written reasons add seconds to every search (its latency is high and shared), so they are OFF by default:
// searches return instantly with the rule-based summary. Set ROOMMATE_MUSE_EXPLAIN=1 to turn them on.
const EXPLAIN_TOP = process.env.ROOMMATE_MUSE_EXPLAIN === "1" ? 2 : 0;
const EXPLAIN_TIMEOUT_MS = 8000; // when enabled, a slow Muse call still never holds a search past this: falls back to the rule-based summary

/** The person searching, built from the intake form. Fields the form doesn't ask about stay "unknown". */
export function goalToProfile(goal: any): RoommateProfile {
  return {
    id: "me", user_id: "me", name: "You",
    seeking: goal.alreadyHasHome ? "has_room" : "needs_room",
    city: goal.city ?? null,
    areas: goal.preferredNeighborhoods ?? [],
    budget_amount: goal.budgetAmount ?? null,
    budget_basis: goal.budgetBasis === "home" ? "home" : goal.budgetBasis === "person" ? "person" : "unknown",
    move_in: goal.startDate ?? null,
    move_out: goal.endDate ?? null,
    occupation_or_school: null, cleanliness: "unknown", sleep_schedule: "unknown", smoking: "unknown", pets: "unknown",
    social_style: (goal.preferences ?? []).includes("Quiet home") ? "quiet" : "unknown",
    other_traits: [], evidence: [],
  };
}

const uiStatus = (s: Criterion["status"]) => (s === "conflict" ? "not-matched" : s);

const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T) =>
  Promise.race([p, new Promise<T>((ok) => setTimeout(() => ok(fallback), ms))]);

function introduction(r: any): string {
  const bits = [r.occupation_or_school, ...(r.other_traits ?? [])].filter(Boolean);
  return bits.length ? bits.join(" · ") : "Looking for a roommate";
}

export async function searchRoommates(goal: any, limit = 5) {
  if (goal.intent === "Home") return [];
  const rows: any[] = check(await adminDb().from("roommate_profiles")
    .select("*, user:fb_users(name,avatar_url), group:fb_groups(name)").eq("opted_in", true), "read roommate_profiles");
  const me = goalToProfile(goal);
  const sources: string[] = goal.sourceIds ?? [];

  const scored = rows
    .filter((r) => !sources.length || !r.source_group_id || sources.includes(r.source_group_id))
    .map((r) => ({ r, p: { ...r, name: r.user?.name ?? "Group member" } as RoommateProfile }))
    .map((x) => ({ ...x, ev: evaluatePair(me, x.p) }))
    .filter((x) => x.ev && !x.ev.hardConflict)
    .sort((a, b) => a.ev!.conflicts - b.ev!.conflicts || b.ev!.matched - a.ev!.matched || a.ev!.unknown - b.ev!.unknown)
    .slice(0, limit);

  return Promise.all(scored.map(async ({ r, p, ev }, i) => {
    const fallback: Explanation = { traits: [], summary: plainSummary(p, ev!), by: "code" };
    const why = i < EXPLAIN_TOP ? await withTimeout(explain(me, p, ev!), EXPLAIN_TIMEOUT_MS, fallback) : fallback;
    return {
      id: `rp-${r.id}`,
      name: p.name ?? "Group member",
      photoUrl: r.user?.avatar_url ?? "",
      introduction: introduction(r),
      occupation: r.occupation_or_school ?? null,   // used by the swipe cards
      traits: r.other_traits ?? [],
      dates: [r.move_in ?? "", r.move_out ?? ""],
      budgetPerPerson: r.budget_basis === "person" ? r.budget_amount ?? 0 : 0,
      preferredAreas: r.areas ?? [],
      explicitLivingPreferences: [
        ...(r.other_traits ?? []),
        ...(r.sleep_schedule !== "unknown" ? [`${r.sleep_schedule} sleeper`] : []),
        ...(r.cleanliness !== "unknown" ? [`${r.cleanliness.replace("_", " ")}`] : []),
        ...(r.social_style !== "unknown" ? [`${r.social_style}`] : []),
      ],
      sourceId: r.source_group_id ?? "profile",
      sourceName: r.group?.name ?? "Group post",
      sourceUrl: null,
      originalPostText: r.original_text ?? "",
      seekingRoommates: true,
      // extra fields used by the swipe cards
      seeking: r.seeking,            // "has_room" | "needs_room": their situation
      pairing: ev!.kind,
      matchSummary: why.summary,
      matchSummaryBy: why.by,
      criteria: [
        ...ev!.criteria.map((c) => ({ criterionId: c.id, label: c.label, status: uiStatus(c.status), explanation: c.evidence, evidence: c.evidence })),
        ...why.traits.map((t, k) => ({ criterionId: `trait-${k}`, label: t.topic, status: t.status === "compatible" ? "matched" : t.status === "conflict" ? "not-matched" : "unknown",
          explanation: t.note, evidence: t.note })),
      ],
    };
  }));
}
