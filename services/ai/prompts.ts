import { POST_CATEGORIES, LISTING_TYPES } from "./types";

export const systemPrompt = (today = new Date().toISOString().slice(0, 10)) => `Today is ${today}. You analyze informal Facebook Group posts for Nest, an app for young adults moving to a new city.
Classify the post and extract structured data.
Rules:
- Only use facts stated in the post text or visible in attached images. NEVER guess; use null for anything missing.
- rent is a monthly USD number ("1.8k" = 1800, "$950/mo" = 950). For a roommate/room post with a per-person price, use that.
- city: the city the listing is in (any city worldwide), as a plain English name like "Seattle" or "Vancouver". Infer it from the neighborhood or group name if the post does not say (e.g. Capitol Hill + a Seattle group => Seattle). null if truly unknown.
- location is the neighborhood/area within that city. latitude/longitude: approximate centre of that neighborhood, only if you are confident, else null.
- rent_basis: "person" if the rent is for one person/room (a room for rent, "each", "per person", "split"); "home" if it is for the whole unit (a studio, a 1br apartment, a whole-apartment sublet or lease takeover); null if unclear.
- Dates: YYYY-MM-DD. A date with no year means its next occurrence on or after today. "June-Aug" means move_in_date June 1 and available_to Aug 31 (last day of the end month) unless exact days are given. available_to is null if the post gives no end.
- Understand abbreviations (BR/bd = bedroom, ba = bathroom, SLU = South Lake Union, W/D = washer/dryer, util = utilities, DM = contact via direct message, OBO = or best offer).
- category must be one of: ${POST_CATEGORIES.join(", ")}.
- listing_type must be one of: ${LISTING_TYPES.join(", ")} or null.
- Fill "housing" only for housing_listing, lease_takeover, roommate_request. Fill "item" only for furniture_sale, free_item. Otherwise both null.
- living_preferences: only lifestyle wishes the poster explicitly states about the household (e.g. "quiet", "no smokers", "clean", "early riser"). Empty if none.
- amenities: short lowercase labels like "in-unit laundry", "parking", "gym", "pets allowed", "furnished".
Return only JSON matching the schema.`;

const nullable = (t: string) => ({ type: [t, "null"] });

export const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: [...POST_CATEGORIES] },
    confidence: { type: "number" },
    summary: { type: "string" },
    housing: {
      type: ["object", "null"],
      properties: {
        title: nullable("string"), rent: nullable("number"), rent_basis: { type: ["string", "null"], enum: ["person", "home", null] }, city: nullable("string"), location: nullable("string"), latitude: nullable("number"), longitude: nullable("number"), address: nullable("string"),
        listing_type: { type: ["string", "null"], enum: [...LISTING_TYPES, null] },
        availability: nullable("string"), move_in_date: nullable("string"), available_to: nullable("string"), lease_duration: nullable("string"),
        bedrooms: nullable("number"), bathrooms: nullable("number"),
        amenities: { type: "array", items: { type: "string" } },
        utilities: nullable("string"), contact: nullable("string"),
        living_preferences: { type: "array", items: { type: "string" } },
      },
      required: ["title", "rent", "rent_basis", "city", "location", "latitude", "longitude", "address", "listing_type", "availability", "move_in_date", "available_to", "lease_duration", "bedrooms", "bathrooms", "amenities", "utilities", "contact", "living_preferences"],
    },
    item: {
      type: ["object", "null"],
      properties: { title: nullable("string"), category: nullable("string"), price: nullable("number"), location: nullable("string"), condition: nullable("string") },
      required: ["title", "category", "price", "location", "condition"],
    },
  },
  required: ["category", "confidence", "summary", "housing", "item"],
} as const;
