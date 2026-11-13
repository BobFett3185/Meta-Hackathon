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

/** Fuzzy check for reposts / cross-posts of the same listing. Conflicting facts always mean "not a duplicate". */
export function isLikelyDuplicate(
  a: { housing: HousingExtraction; text: string; authorId?: string },
  b: { housing: HousingExtraction; text: string; authorId?: string },
): boolean {
  const ra = a.housing.rent, rentB = b.housing.rent;
  if (ra != null && rentB != null && ra !== rentB) return false;
  const la = norm(a.housing.location), lb = norm(b.housing.location);
  if (la && lb && la !== lb) return false;
  const ca = norm(a.housing.city), cb = norm(b.housing.city);
  if (ca && cb && ca !== cb) return false;
  const ka = dedupeKey(a.housing), kb = dedupeKey(b.housing);
  if (ka && ka === kb) return true;
  const textSim = jaccard(tokens(a.text), tokens(b.text));
  const sameAuthor = !!a.authorId && a.authorId === b.authorId;
  const sameRent = ra != null && ra === rentB;
  // Templated posts from different people share wording, so text alone only counts for the same author.
  if (sameAuthor && textSim >= 0.6) return true;
  return sameRent && !!la && la === lb && textSim >= 0.6;
}

/** Returns the index of the first existing listing the candidate duplicates, or -1. */
export function findDuplicate(
  candidate: { housing: HousingExtraction; text: string; authorId?: string },
  existing: { housing: HousingExtraction; text: string; authorId?: string }[],
): number {
  return existing.findIndex((e) => isLikelyDuplicate(candidate, e));
}
