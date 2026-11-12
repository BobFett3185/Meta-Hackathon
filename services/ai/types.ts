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
  location: string | null;        // neighborhood / city
  address: string | null;
  listing_type: ListingType | null;
  availability: string | null;    // free text, e.g. "available now"
  move_in_date: string | null;    // YYYY-MM-DD
  lease_duration: string | null;  // e.g. "3 months"
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: string[];
  utilities: string | null;
  contact: string | null;
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
}
