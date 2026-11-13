// Roommate matching.
//   1. Hard criteria are computed in code: budget, dates, area, plus enum lifestyle fields.
//      Each carries a status (matched | conflict | unknown) and the evidence used.
//   2. Muse (optional) reads ONLY free-text traits + those criteria, flags soft conflicts and writes a short
//      plain-English reason. It cannot change a status computed in code.
//   No numeric "compatibility %": results are ranked by conflicts, then matched criteria.
import { getAI } from "../ai";
import type { Criterion, RoommateProfile } from "./types";

const BUDGET_SLACK = 0.15; // within 15% still counts as workable
const crit = (id: string, label: string, status: Criterion["status"], evidence: string): Criterion => ({ id, label, status, evidence });

function budget(a: RoommateProfile, b: RoommateProfile, maximum = false): Criterion {
  if (!a.budget_amount || !b.budget_amount) return crit("budget", "Budget", "unknown", "One of you did not state a budget");
  if (a.budget_basis !== b.budget_basis)
    return crit("budget", "Budget", "unknown",
      a.budget_basis === "unknown" || b.budget_basis === "unknown"
        ? "Unclear whether the amount is per person or for the whole home"
        : "One amount is per person and the other is for the whole home");
  const [lo, hi] = [a.budget_amount, b.budget_amount].sort((x, y) => x - y);
  const ev = `$${a.budget_amount} vs $${b.budget_amount} ${a.budget_basis === "person" ? "per person" : "total"}`;
  if (maximum) return b.budget_amount <= a.budget_amount
    ? crit("budget", "Within your budget", "matched", ev)
    : crit("budget", "Above your budget", "conflict", ev);
  return (hi - lo) / hi <= BUDGET_SLACK ? crit("budget", "Similar budgets", "matched", ev) : crit("budget", "Budgets differ a lot", "conflict", ev);
}

function dates(a: RoommateProfile, b: RoommateProfile): Criterion {
  if (!a.move_in || !b.move_in) return crit("dates", "Dates", "unknown", "One of you did not state move-in dates");
  const endA = a.move_out ?? "9999-12-31", endB = b.move_out ?? "9999-12-31";
  const start = a.move_in > b.move_in ? a.move_in : b.move_in;
  const end = endA < endB ? endA : endB;
  const ev = `${a.move_in} → ${a.move_out ?? "open"} and ${b.move_in} → ${b.move_out ?? "open"}`;
  return start <= end ? crit("dates", "Your dates overlap", "matched", ev) : crit("dates", "Dates do not overlap", "conflict", ev);
}

const canon = (s: string) => s.toLowerCase().replace(/slu/, "south lake union").replace("cap hill", "capitol hill");
/** "Seattle, WA" and "seattle" are the same city. */
const cityKey = (s: string | null) => (s ?? "").split(",")[0].trim().toLowerCase();

/** City is its own check: a different city is a hard conflict even when neighborhoods are unspecified. */
function city(a: RoommateProfile, b: RoommateProfile): Criterion | null {
  const ca = cityKey(a.city), cb = cityKey(b.city);
  if (!ca && !cb) return null;
  if (!ca || !cb) return crit("city", "City", "unknown", "One of you did not name a city");
  return ca === cb ? crit("city", "Same city", "matched", b.city ?? "")
    : crit("city", "Different cities", "conflict", `${a.city} vs ${b.city}`);
}

function area(a: RoommateProfile, b: RoommateProfile): Criterion {
  if (!a.areas.length || !b.areas.length) return crit("area", "Area", "unknown", "One of you did not name a neighborhood");
  const mine = a.areas.map(canon);
  const shared = b.areas.filter((x) => mine.includes(canon(x)));
  return shared.length ? crit("area", "Same neighborhood", "matched", shared.join(", "))
    : crit("area", "Different neighborhoods", "conflict", `${a.areas.join(", ")} vs ${b.areas.join(", ")}`);
}

/** Enum lifestyle fields: judged only when BOTH people said something. */
function lifestyle(a: RoommateProfile, b: RoommateProfile): Criterion[] {
  const out: Criterion[] = [];
  const both = (k: keyof RoommateProfile) => a[k] !== "unknown" && b[k] !== "unknown";
  if (both("smoking")) {
    const bad = a.smoking !== b.smoking && (a.smoking === "non_smoker" || b.smoking === "non_smoker");
    out.push(crit("smoking", bad ? "Different smoking habits" : "Same smoking habits", bad ? "conflict" : "matched", `${a.smoking} / ${b.smoking}`));
  }
  if (both("sleep_schedule")) {
    const clash = new Set([a.sleep_schedule, b.sleep_schedule]).size === 2 && [a.sleep_schedule, b.sleep_schedule].every((s) => s === "early" || s === "night");
    out.push(crit("sleep", clash ? "Opposite sleep schedules" : "Compatible sleep schedules", clash ? "conflict" : "matched", `${a.sleep_schedule} / ${b.sleep_schedule}`));
  }
  if (both("cleanliness")) {
    const order = { relaxed: 0, tidy: 1, very_tidy: 2, unknown: 0 };
    const far = Math.abs(order[a.cleanliness] - order[b.cleanliness]) >= 2;
    out.push(crit("cleanliness", far ? "Different cleanliness standards" : "Similar cleanliness", far ? "conflict" : "matched", `${a.cleanliness} / ${b.cleanliness}`));
  }
  if (both("social_style")) {
    const far = new Set([a.social_style, b.social_style]).size === 2 && [a.social_style, b.social_style].every((s) => s === "quiet" || s === "social");
    out.push(crit("social", far ? "Different social styles" : "Similar social styles", far ? "conflict" : "matched", `${a.social_style} / ${b.social_style}`));
  }
  if (both("pets")) {
    const bad = (a.pets === "has_pets" && b.pets === "no_pets") || (b.pets === "has_pets" && a.pets === "no_pets");
    out.push(crit("pets", bad ? "Pet conflict" : "Pets are fine for both", bad ? "conflict" : "matched", `${a.pets} / ${b.pets}`));
  }
  return out;
}

export type PairKind = "household" | "fill_room";
/** Two seekers can look for a place together; a has_room person needs a seeker; two has_room never pair. */
export function pairing(a: RoommateProfile, b: RoommateProfile): PairKind | null {
  if (a.seeking === "needs_room" && b.seeking === "needs_room") return "household";
  return a.seeking !== b.seeking ? "fill_room" : null;
}

export interface PairEvaluation { kind: PairKind; criteria: Criterion[]; conflicts: number; matched: number; unknown: number; hardConflict: boolean }

export function evaluatePair(a: RoommateProfile, b: RoommateProfile, { budgetIsMaximum = false } = {}): PairEvaluation | null {
  const kind = pairing(a, b);
  if (!kind) return null;
  const cityCrit = city(a, b);
  // neighborhoods only mean something inside the same city
  const areaCrit = cityCrit?.status === "conflict" ? null : area(a, b);
  const criteria = [budget(a, b, budgetIsMaximum), dates(a, b), ...(cityCrit ? [cityCrit] : []), ...(areaCrit ? [areaCrit] : []), ...lifestyle(a, b)];
  const count = (s: Criterion["status"]) => criteria.filter((c) => c.status === s).length;
  return {
    kind, criteria, conflicts: count("conflict"), matched: count("matched"), unknown: count("unknown"),
    hardConflict: criteria.some((c) => ["budget", "dates", "city", "area"].includes(c.id) && c.status === "conflict"),
  };
}

// ---- Muse: soft traits + grounded explanation ----------------------------------------------------
export interface Explanation { traits: { topic: string; status: "compatible" | "conflict" | "unknown"; note: string }[]; summary: string; by: "muse" | "code" }

const PAIR_SCHEMA = {
  type: "object", additionalProperties: false, required: ["traits", "summary"],
  properties: {
    traits: { type: "array", items: { type: "object", additionalProperties: false, required: ["topic", "status", "note"],
      properties: { topic: { type: "string" }, status: { type: "string", enum: ["compatible", "conflict", "unknown"] }, note: { type: "string" } } } },
    summary: { type: "string" },
  },
};
const SYSTEM = `You help explain roommate compatibility. You are given two people's self-written free-text traits and criteria already evaluated by code.
Rules:
- Never change, contradict, or re-score the evaluated criteria. They are final.
- Use ONLY facts present in the input. Do not invent personality, habits, or preferences.
- traits: judge pairs of free-text traits the criteria do not already cover. Use "unknown" if there is nothing to compare. At most 4 items.
- summary: 1-2 plain sentences addressed to person A about why B could or could not work, mentioning real conflicts and unknowns honestly. No scores or percentages.`;

export function plainSummary(b: RoommateProfile, ev: PairEvaluation): string {
  const by = (s: Criterion["status"]) => ev.criteria.filter((c) => c.status === s);
  const good = by("matched").map((c) => c.label.toLowerCase()), bad = by("conflict").map((c) => c.label.toLowerCase()), unk = by("unknown").map((c) => c.id);
  return [good.length && `${b.name ?? "They"}: ${good.join(", ")}.`, bad.length && `Watch out: ${bad.join(", ")}.`, unk.length && `Not stated: ${unk.join(", ")}.`]
    .filter(Boolean).join(" ");
}

export async function explain(a: RoommateProfile, b: RoommateProfile, ev: PairEvaluation): Promise<Explanation> {
  const fallback: Explanation = { traits: [], summary: plainSummary(b, ev), by: "code" };
  const ai = getAI();
  if (ai.provider !== "muse" || !ai.completeJSON) return fallback;
  try {
    const slim = (p: RoommateProfile) => ({ name: p.name, seeking: p.seeking, traits: p.other_traits, occupation_or_school: p.occupation_or_school });
    const out: any = await ai.completeJSON({
      name: "RoommatePairJudgement", schema: PAIR_SCHEMA, system: SYSTEM,
      user: JSON.stringify({ person_a: slim(a), person_b: slim(b), pairing: ev.kind, evaluated_criteria: ev.criteria }),
    });
    if (!out || !Array.isArray(out.traits) || typeof out.summary !== "string" || !out.summary.trim()) return fallback;
    const status = new Set(["compatible", "conflict", "unknown"]);
    return {
      by: "muse", summary: out.summary.trim().slice(0, 400),
      traits: out.traits.slice(0, 4).filter((t: any) => status.has(t?.status))
        .map((t: any) => ({ topic: String(t.topic ?? "").slice(0, 60), status: t.status, note: String(t.note ?? "").slice(0, 240) })),
    };
  } catch { return fallback; }
}

export interface Match { profile: RoommateProfile; kind: PairKind; criteria: Criterion[]; conflicts: number; explanation: Explanation }

/** Rank candidates for `me`; hard conflicts (budget/dates/area) are dropped. Muse explains only the top few. */
export async function findMatches(me: RoommateProfile, candidates: RoommateProfile[], { limit = 5, explainTop = 3, useMuse = true } = {}): Promise<Match[]> {
  const scored = candidates
    .filter((c) => c.id !== me.id && c.user_id !== me.user_id)
    .map((profile) => ({ profile, ev: evaluatePair(me, profile) }))
    .filter((x): x is { profile: RoommateProfile; ev: PairEvaluation } => !!x.ev && !x.ev.hardConflict)
    .sort((x, y) => x.ev.conflicts - y.ev.conflicts || y.ev.matched - x.ev.matched || x.ev.unknown - y.ev.unknown)
    .slice(0, limit);
  return Promise.all(scored.map(async ({ profile, ev }, i) => ({
    profile, kind: ev.kind, criteria: ev.criteria, conflicts: ev.conflicts,
    explanation: useMuse && i < explainTop ? await explain(me, profile, ev) : { traits: [], summary: plainSummary(profile, ev), by: "code" as const },
  })));
}
