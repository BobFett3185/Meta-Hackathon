// Natural-language query -> structured SearchGoal, using Muse. Works for any city; no local fallback parser.
import { getAI } from "../services/ai";

const GOAL_SCHEMA = {
  type: "object",
  properties: {
    intent: { type: "string", enum: ["Home", "Roommate", "Both"] },
    city: { type: ["string", "null"] },
    preferredNeighborhoods: { type: "array", items: { type: "string" } },
    startDate: { type: ["string", "null"] },
    endDate: { type: ["string", "null"] },
    budgetAmount: { type: ["number", "null"] },
    budgetBasis: { type: ["string", "null"], enum: ["person", "home", null] },
    housingType: { type: ["string", "null"] },
    furnishedRequirement: { type: ["boolean", "null"] },
    roommateCount: { type: ["number", "null"] },
    alreadyHasHome: { type: ["boolean", "null"] },
    preferences: { type: "array", items: { type: "string" } },
    missing: { type: ["string", "null"] },
  },
  required: ["intent", "city", "preferredNeighborhoods", "startDate", "endDate", "budgetAmount", "budgetBasis", "housingType", "furnishedRequirement", "roommateCount", "alreadyHasHome", "preferences", "missing"],
};

const system = (today: string, ctx: Ctx, city: string) => `Today is ${today}. You turn a young adult's housing request into a structured search for Nest.
The user's current/default city: ${city || "unknown"}.
Cities we currently have listings for: ${ctx.cities.join(", ") || "none yet"}. Neighborhoods we know: ${Object.entries(ctx.neighborhoodsByCity).map(([c, h]) => `${c}: ${h.join(", ")}`).join("; ") || "none yet"}.
Rules:
- The user may ask about ANY city in the world, including ones not listed above. Use the city exactly as they mean it (plain English name). Never swap in a different city.
- Use only what the user wrote. Use null / [] for anything not stated. Never invent a budget or dates.
- intent: "Home" (just housing), "Roommate" (just a roommate), "Both" if they want a place AND someone to share with.
- Dates are YYYY-MM-DD. "June-August 2027" => startDate 2027-06-01, endDate 2027-08-31. A month with no year means its next occurrence after today.
- budgetBasis: "person" for "each", "per person", "my share"; "home" for "total"/"whole place". null if they gave a budget but not which.
- preferredNeighborhoods: neighborhoods they name. Prefer the canonical names above when they match, and expand common local abbreviations to the full neighborhood name. Empty if they only name a city.
- preferences: short lifestyle wishes ("Quiet home", "Near work", "Pet friendly", "Non-smoker").
- missing: if the city, budget or dates are absent, a short friendly question asking for the most important missing item; otherwise null.`;

type Ctx = { cities: string[]; neighborhoodsByCity: Record<string, string[]> };

export interface InterpretResult { goal: any; missing: string | null; via: "muse" }

export async function interpret(text: string, base: any, ctx: Ctx): Promise<InterpretResult> {
  if (!text.trim()) return { goal: { ...base, rawPrompt: text }, missing: "Tell Nest where you are moving, your dates, and your budget.", via: "muse" };
  const ai = getAI();
  if (!ai.completeJSON) throw new Error("Muse is not configured on the server (set MUSE_API_KEY and AI_PROVIDER=muse).");
  const r: any = await ai.completeJSON({
    name: "SearchGoal", schema: GOAL_SCHEMA,
    system: system(new Date().toISOString().slice(0, 10), ctx, base?.city ?? ""), user: text,
  });
  const pick = (v: any, fb: any) => (v === null || v === undefined || (Array.isArray(v) && !v.length) ? fb : v);
  const city = pick(r.city, base.city);
  const norm = (s: any) => String(s ?? "").trim().toLowerCase();
  const sameCity = norm(city) === norm(base.city);
  // For a city we have listings in, keep only neighborhoods we actually know (in their canonical spelling).
  // A vague area like "downtown" would otherwise become a strict filter that no listing can match.
  const known = Object.entries(ctx.neighborhoodsByCity).find(([c]) => norm(c) === norm(city))?.[1];
  if (known) r.preferredNeighborhoods = [...new Set((r.preferredNeighborhoods ?? []).map((n: string) => known.find((k) => norm(k) === norm(n))).filter(Boolean))];
  const goal = {
    ...base, rawPrompt: text,
    intent: r.intent ?? base.intent,
    city,
    // Never carry neighborhoods over from a different city.
    preferredNeighborhoods: r.preferredNeighborhoods.length ? r.preferredNeighborhoods : sameCity ? base.preferredNeighborhoods : [],
    startDate: pick(r.startDate, base.startDate), endDate: pick(r.endDate, base.endDate),
    budgetAmount: pick(r.budgetAmount, base.budgetAmount), budgetBasis: pick(r.budgetBasis, base.budgetBasis),
    housingType: pick(r.housingType, base.housingType),
    furnishedRequirement: pick(r.furnishedRequirement, base.furnishedRequirement),
    roommateCount: r.intent === "Home" ? null : pick(r.roommateCount, base.roommateCount),
    alreadyHasHome: pick(r.alreadyHasHome, base.alreadyHasHome),
    preferences: [...new Set<string>(r.preferences ?? [])],
  };
  const missing = r.missing && (!r.city || !r.budgetAmount || !r.startDate) ? r.missing : null;
  return { goal, missing, via: "muse" };
}
