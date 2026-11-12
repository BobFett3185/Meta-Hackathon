import { POST_CATEGORIES, LISTING_TYPES } from "./types";

export const SYSTEM_PROMPT = `You analyze informal Facebook Group posts for Nest, an app for young adults moving to a new city.
Classify the post and extract structured data.
Rules:
- Only use facts stated in the post text or visible in attached images. NEVER guess; use null for anything missing.
- rent is a monthly USD number ("1.8k" = 1800, "$950/mo" = 950). For a roommate/room post with a per-person price, use that.
- Dates: YYYY-MM-DD. Assume the current year unless stated; "June 1" with no year means the next upcoming June 1.
- Understand abbreviations (BR/bd = bedroom, ba = bathroom, SLU = South Lake Union, W/D = washer/dryer, util = utilities, DM = contact via direct message, OBO = or best offer).
- category must be one of: ${POST_CATEGORIES.join(", ")}.
- listing_type must be one of: ${LISTING_TYPES.join(", ")} or null.
- Fill "housing" only for housing_listing, lease_takeover, roommate_request. Fill "item" only for furniture_sale, free_item. Otherwise both null.
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
        title: nullable("string"), rent: nullable("number"), location: nullable("string"), address: nullable("string"),
        listing_type: { type: ["string", "null"], enum: [...LISTING_TYPES, null] },
        availability: nullable("string"), move_in_date: nullable("string"), lease_duration: nullable("string"),
        bedrooms: nullable("number"), bathrooms: nullable("number"),
        amenities: { type: "array", items: { type: "string" } },
        utilities: nullable("string"), contact: nullable("string"),
      },
      required: ["title", "rent", "location", "address", "listing_type", "availability", "move_in_date", "lease_duration", "bedrooms", "bathrooms", "amenities", "utilities", "contact"],
    },
    item: {
      type: ["object", "null"],
      properties: { title: nullable("string"), category: nullable("string"), price: nullable("number"), location: nullable("string"), condition: nullable("string") },
      required: ["title", "category", "price", "location", "condition"],
    },
  },
  required: ["category", "confidence", "summary", "housing", "item"],
} as const;
