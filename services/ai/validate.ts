import { POST_CATEGORIES, LISTING_TYPES, type PostAnalysis, type HousingExtraction, type ItemExtraction } from "./types";

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const date = (v: unknown) => {
  const s = str(v);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null;
};

const ALIASES: Record<string, string> = {
  slu: "South Lake Union", "u district": "University District", udub: "University District",
  "cap hill": "Capitol Hill", "lower qa": "Queen Anne", "green lake": "Green Lake",
};
/** Canonical neighborhood name so "SLU" and "South Lake Union" compare equal. */
export const canonLocation = (v: unknown) => {
  const s = str(v);
  return s ? ALIASES[s.toLowerCase()] ?? s : null;
};

function housing(h: any): HousingExtraction | null {
  if (!h || typeof h !== "object") return null;
  const out: HousingExtraction = {
    title: str(h.title),
    rent: num(h.rent),
    rent_basis: h.rent_basis === "person" || h.rent_basis === "home" ? h.rent_basis : null,
    city: str(h.city),
    location: canonLocation(h.location),
    latitude: typeof h.latitude === "number" && Math.abs(h.latitude) <= 90 ? h.latitude : null,
    longitude: typeof h.longitude === "number" && Math.abs(h.longitude) <= 180 ? h.longitude : null,
    address: str(h.address),
    listing_type: (LISTING_TYPES as readonly string[]).includes(h.listing_type) ? h.listing_type : null,
    availability: str(h.availability),
    move_in_date: date(h.move_in_date),
    available_to: date(h.available_to),
    lease_duration: str(h.lease_duration),
    bedrooms: num(h.bedrooms),
    bathrooms: num(h.bathrooms),
    amenities: Array.isArray(h.amenities) ? h.amenities.map(str).filter((x): x is string => !!x) : [],
    utilities: str(h.utilities),
    contact: str(h.contact),
    living_preferences: Array.isArray(h.living_preferences) ? h.living_preferences.map(str).filter((x): x is string => !!x) : [],
    missing_fields: [],
  };
  for (const k of ["rent", "city", "location", "move_in_date", "lease_duration", "bedrooms", "bathrooms", "listing_type"] as const) {
    if (out[k] === null) out.missing_fields.push(k);
  }
  return out;
}

function item(i: any): ItemExtraction | null {
  if (!i || typeof i !== "object") return null;
  return { title: str(i.title), category: str(i.category), price: num(i.price), location: str(i.location), condition: str(i.condition) };
}

/** Throws if the AI output is unusable; otherwise returns a clean, normalized PostAnalysis. */
export function validateAnalysis(raw: unknown): PostAnalysis {
  const r = raw as any;
  if (!r || typeof r !== "object") throw new Error("AI output is not an object");
  if (!(POST_CATEGORIES as readonly string[]).includes(r.category)) throw new Error(`Invalid category: ${r.category}`);
  const isHousing = ["housing_listing", "lease_takeover", "roommate_request"].includes(r.category);
  const isItem = ["furniture_sale", "free_item"].includes(r.category);
  return {
    category: r.category,
    confidence: typeof r.confidence === "number" ? Math.min(1, Math.max(0, r.confidence)) : 0.5,
    housing: isHousing ? housing(r.housing) : null,
    item: isItem ? item(r.item) : null,
    summary: str(r.summary) ?? "",
  };
}
