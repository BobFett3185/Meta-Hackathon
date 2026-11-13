// Roommate-request post -> roommate profile (or nothing).
// Runs AFTER the shared ingestion classifier: it only sees posts already labelled `roommate_request`.
// Rule: a profile exists only when the author says something about THEMSELVES. Housing needs alone
// ("need a room, $900") are not enough, and every kept detail must be backed by a verbatim quote.
import { getAI } from "../ai";
import { BASIS, CLEAN, PETS, SEEKING, SLEEP, SMOKING, SOCIAL, type ProfileFields } from "./types";

export const MIN_SELF_FACTS = 2;

const nullable = (type: string) => ({ type: [type, "null"] });
const en = (values: readonly string[]) => ({ type: "string", enum: [...values] });

export const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_roommate_request", "seeking", "city", "areas", "budget_amount", "budget_basis", "move_in", "move_out",
    "occupation_or_school", "cleanliness", "sleep_schedule", "smoking", "pets", "social_style", "other_traits", "evidence"],
  properties: {
    is_roommate_request: { type: "boolean" },
    seeking: en(SEEKING),
    city: nullable("string"),
    areas: { type: "array", items: { type: "string" } },
    budget_amount: nullable("integer"),
    budget_basis: en(BASIS),
    move_in: nullable("string"),
    move_out: nullable("string"),
    occupation_or_school: nullable("string"),
    cleanliness: en(CLEAN),
    sleep_schedule: en(SLEEP),
    smoking: en(SMOKING),
    pets: en(PETS),
    social_style: en(SOCIAL),
    other_traits: { type: "array", items: { type: "string" } },
    evidence: { type: "array", items: { type: "string" } },
  },
};

const SYSTEM = (today: string) => `Today is ${today}. You extract a roommate profile from one informal Facebook housing-group post written by someone looking for a roommate or a place.
Rules:
- Only use what the post explicitly says. Never guess, infer, or fill gaps. Use null / "unknown" / [] when not stated.
- is_roommate_request: true only if the author wants a roommate or someone to take a room.
- seeking: "needs_room" if the author wants a place and/or people to share one; "has_room" if they already have a room/place and want someone to fill it; "unclear" if you cannot tell.
- occupation_or_school, cleanliness, sleep_schedule, smoking, pets, social_style, other_traits describe the AUTHOR as a person, never the apartment.
- other_traits: short phrases for anything else they say about themselves (e.g. "works night shifts", "3rd year student"). Do not repeat fields already captured above.
- budget_amount: whole dollars per month. budget_basis: "person" if per person / each, "home" if total, else "unknown".
- Dates: YYYY-MM-DD. A month name with no year means its next occurrence after today. A range like "june-aug" is the 1st of the start month to the last day of the end month. null if no dates.
- evidence: 1-4 short EXACT quotes copied from the post that support the self-description fields.
Return only JSON matching the schema.`;

const oneOf = <T extends string>(v: unknown, list: readonly T[], name: string): T => {
  if (!list.includes(v as T)) throw new Error(`invalid ${name}: ${JSON.stringify(v)}`);
  return v as T;
};
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const strs = (v: unknown, name: string) => {
  if (v == null) return [];
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) throw new Error(`invalid ${name}`);
  return (v as string[]).map((x) => x.trim()).filter(Boolean);
};
const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export type Validated = ProfileFields & { is_roommate_request: boolean; seeking_raw: (typeof SEEKING)[number] };

/** Validates + normalizes model output. Evidence quotes that don't appear in the post are dropped. */
export function validateExtraction(raw: any, postText: string): Validated {
  if (!raw || typeof raw !== "object") throw new Error("extraction is not an object");
  const text = postText.toLowerCase();
  const seeking = oneOf(raw.seeking, SEEKING, "seeking");
  let move_in = isDate(raw.move_in) ? raw.move_in : null;
  let move_out = isDate(raw.move_out) ? raw.move_out : null;
  if (move_in && move_out && move_out < move_in) move_in = move_out = null;
  return {
    is_roommate_request: raw.is_roommate_request === true,
    seeking_raw: seeking,
    seeking: seeking === "has_room" ? "has_room" : "needs_room",
    city: str(raw.city),
    areas: strs(raw.areas, "areas"),
    budget_amount: Number.isInteger(raw.budget_amount) && raw.budget_amount > 0 && raw.budget_amount < 20000 ? raw.budget_amount : null,
    budget_basis: oneOf(raw.budget_basis, BASIS, "budget_basis"),
    move_in,
    move_out,
    occupation_or_school: str(raw.occupation_or_school),
    cleanliness: oneOf(raw.cleanliness, CLEAN, "cleanliness"),
    sleep_schedule: oneOf(raw.sleep_schedule, SLEEP, "sleep_schedule"),
    smoking: oneOf(raw.smoking, SMOKING, "smoking"),
    pets: oneOf(raw.pets, PETS, "pets"),
    social_style: oneOf(raw.social_style, SOCIAL, "social_style"),
    other_traits: strs(raw.other_traits, "other_traits"),
    evidence: strs(raw.evidence, "evidence").filter((q) => text.includes(q.toLowerCase())),
  };
}

/** How many things did the person say about THEMSELVES (not about the housing)? */
export function selfFacts(p: ProfileFields): number {
  return [
    p.occupation_or_school, p.cleanliness !== "unknown", p.sleep_schedule !== "unknown",
    p.smoking !== "unknown", p.pets !== "unknown", p.social_style !== "unknown",
  ].filter(Boolean).length + p.other_traits.length;
}

export type ExtractResult =
  | { ok: true; profile: ProfileFields }
  | { ok: false; reason: string; retry?: boolean };  // retry: transient (Muse unavailable), not a real rejection

export async function extractProfile(text: string, referenceDate = new Date()): Promise<ExtractResult> {
  const ai = getAI();
  if (ai.provider !== "muse" || !ai.completeJSON) return { ok: false, reason: "Muse is not configured", retry: true };
  let raw: unknown;
  try {
    raw = await ai.completeJSON({
      name: "RoommateExtraction",
      schema: EXTRACTION_SCHEMA,
      system: SYSTEM(referenceDate.toISOString().slice(0, 10)),
      user: `Post:\n"""\n${text}\n"""`,
    });
  } catch (e) {
    return { ok: false, reason: `Muse failed: ${(e as Error).message.slice(0, 100)}`, retry: true };
  }
  let v: Validated;
  try { v = validateExtraction(raw, text); }
  catch (e) { return { ok: false, reason: `invalid output: ${(e as Error).message}` }; }

  if (!v.is_roommate_request) return { ok: false, reason: "not a roommate request" };
  if (v.seeking_raw === "unclear") return { ok: false, reason: "unclear whether they need or have a room" };
  const facts = selfFacts(v);
  if (facts < MIN_SELF_FACTS) return { ok: false, reason: `only ${facts} fact(s) about themselves (need ${MIN_SELF_FACTS})` };
  if (!v.evidence.length) return { ok: false, reason: "no verifiable quote backing the details" };

  const { is_roommate_request, seeking_raw, ...profile } = v;
  return { ok: true, profile };
}
