export const POST_CATEGORIES = [
  "housing_listing", "lease_takeover", "roommate_request", "furniture_sale",
  "free_item", "friend_request", "intro", "event", "activity_invite", "discussion",
] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

export const LISTING_TYPES = ["apartment", "studio", "private_room", "shared_room", "house", "sublet", "lease_takeover"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

/** Raw input handed to the AI layer. Source post is never mutated. */
export interface RawPostInput {
  id: string;
  content: string;
  imageUrls?: string[];
  communityName?: string;
}

/** Every field is nullable: missing info stays null, never guessed. */
export interface HousingExtraction {
  title: string | null;
  rent: number | null;            // monthly, USD
  rent_basis: "person" | "home" | null; // is rent per person/room, or for the whole unit
  city: string | null;            // city the listing is in, e.g. "Seattle", "Vancouver"
  location: string | null;        // neighborhood / area within the city
  latitude: number | null;        // approximate centre of the neighborhood, only if confident
  longitude: number | null;
  address: string | null;
  listing_type: ListingType | null;
  availability: string | null;    // free text, e.g. "available now"
  move_in_date: string | null;    // YYYY-MM-DD, first day available
  available_to: string | null;    // YYYY-MM-DD, last day available (sublets/leases with an end)
  lease_duration: string | null;  // e.g. "3 months"
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: string[];
  utilities: string | null;
  contact: string | null;
  living_preferences: string[];   // explicit stated lifestyle wishes: "quiet", "no smokers", "clean"
  missing_fields: string[];
}

export interface ItemExtraction {
  title: string | null;
  category: string | null;
  price: number | null;           // 0 for free items
  location: string | null;
  condition: string | null;
}

export interface PostAnalysis {
  category: PostCategory;
  confidence: number;             // 0..1
  housing: HousingExtraction | null;
  item: ItemExtraction | null;
  summary: string;
}

export interface AIService {
  readonly provider: "muse" | "mock";
  analyzePost(post: RawPostInput): Promise<PostAnalysis>;
  /** Schema-constrained JSON completion for server-side features (query interpretation, etc.). Muse only. */
  completeJSON?<T = unknown>(opts: { system: string; user: string; schema: object; name: string; retries?: number }): Promise<T>;
}
