// Roommate profile model. Mirrors supabase/roommates.sql (roommate_profiles).
export const SEEKING = ["needs_room", "has_room", "unclear"] as const;
export const BASIS = ["person", "home", "unknown"] as const;
export const CLEAN = ["very_tidy", "tidy", "relaxed", "unknown"] as const;
export const SLEEP = ["early", "night", "flexible", "unknown"] as const;
export const SMOKING = ["smoker", "non_smoker", "unknown"] as const;
export const PETS = ["has_pets", "ok_with_pets", "no_pets", "unknown"] as const;
export const SOCIAL = ["quiet", "balanced", "social", "unknown"] as const;

export type Seeking = Exclude<(typeof SEEKING)[number], "unclear">;
export type Basis = (typeof BASIS)[number];

/** What a person said about themselves + what they want. "unknown"/null/[] always mean "not stated". */
export interface ProfileFields {
  seeking: Seeking;
  city: string | null;
  areas: string[];
  budget_amount: number | null;
  budget_basis: Basis;
  move_in: string | null;   // YYYY-MM-DD
  move_out: string | null;
  occupation_or_school: string | null;
  cleanliness: (typeof CLEAN)[number];
  sleep_schedule: (typeof SLEEP)[number];
  smoking: (typeof SMOKING)[number];
  pets: (typeof PETS)[number];
  social_style: (typeof SOCIAL)[number];
  other_traits: string[];
  evidence: string[];       // verbatim quotes from the post backing the fields above
}

/** A stored roommate_profiles row (the subset matching needs). */
export interface RoommateProfile extends ProfileFields {
  id: string;
  user_id: string;
  name?: string;
}

export type CriterionStatus = "matched" | "conflict" | "unknown";
export interface Criterion { id: string; label: string; status: CriterionStatus; evidence: string }
