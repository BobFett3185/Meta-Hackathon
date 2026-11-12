import type { HousingExtraction } from "./types";

const norm = (s: string | null) => (s ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => new Set(norm(s).split(" ").filter((w) => w.length > 2));

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n);
}

/** Cheap exact key: same place, same rent, same bedrooms. Null if too little info to key on. */
export function dedupeKey(h: HousingExtraction): string | null {
  const place = norm(h.address ?? h.location);
  if (!place || h.rent == null) return null;
  return [place, h.rent, h.bedrooms ?? "", h.listing_type ?? ""].join("|");
}

/** Fuzzy check for reposts / cross-posts of the same listing. */
export function isLikelyDuplicate(
  a: { housing: HousingExtraction; text: string; authorId?: string },
  b: { housing: HousingExtraction; text: string; authorId?: string },
): boolean {
  const ka = dedupeKey(a.housing), kb = dedupeKey(b.housing);
  if (ka && ka === kb) return true;
  const sameRent = a.housing.rent != null && a.housing.rent === b.housing.rent;
  const sameLoc = norm(a.housing.location) !== "" && norm(a.housing.location) === norm(b.housing.location);
  const textSim = jaccard(tokens(a.text), tokens(b.text));
  if (textSim >= 0.8) return true;
  return sameRent && sameLoc && textSim >= 0.45;
}

/** Returns the index of the first existing listing the candidate duplicates, or -1. */
export function findDuplicate(
  candidate: { housing: HousingExtraction; text: string; authorId?: string },
  existing: { housing: HousingExtraction; text: string; authorId?: string }[],
): number {
  return existing.findIndex((e) => isLikelyDuplicate(candidate, e));
}
