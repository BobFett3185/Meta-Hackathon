import type { IngestedPost, IngestPost } from "./ingest";

/** Matches src/nest/types.d.ts HomeListing (kept structural so the Expo client can consume it as-is). */
export interface HomeListingDTO {
  id: string; title: string; photoUrls: string[]; monthlyRent: number; currency: string;
  rentBasis: "person" | "home"; leaseType: string; city: string; neighborhood: string; latitude: number; longitude: number;
  availableFrom: string; availableTo: string; furnished: boolean; bedrooms: number; availableRooms: number;
  sourceId: string; sourceName: string; sourceUrl: string | null; originalPostText: string;
  facts: Record<string, string>; unknowns: string[];
  // Provenance (extra, ignored by UI)
  rawPostId: string; category: string; confidence: number; extractedBy: "muse" | "mock"; needsReview: boolean;
}

const LABEL: Record<string, string> = {
  apartment: "Apartment", studio: "Studio", private_room: "Private room", shared_room: "Shared room",
  house: "House", sublet: "Sublet", lease_takeover: "Lease takeover",
};
const ROOM_TYPES = new Set(["private_room", "shared_room", "sublet"]);

/** A source is simply the Facebook group the post came from (ids and names live in Supabase fb_groups). */
export function sourceFor(post: { communityId?: string; communityName?: string | null }): { id: string; name: string } {
  return { id: post.communityId ?? "profile", name: post.communityName ?? "Profile post" };
}

/** Returns null for posts that aren't usable listings (no housing data or no rent). Never invents values. */
export function toHomeListing(post: IngestPost, r: IngestedPost): HomeListingDTO | null {
  const h = r.housing;
  if (!h || h.rent == null) return null;
  const src = sourceFor(post);
  const hood = h.location ?? "Unknown";
  const text = post.content.toLowerCase();
  const facts: Record<string, string> = {};
  if (h.utilities) facts.utilities = h.utilities;
  if (h.amenities.length) facts.amenities = h.amenities.join(", ");
  if (h.amenities.includes("furnished")) facts.furniture = "Furnished";
  const unknowns = [...h.missing_fields.map((f) => f.replace(/_/g, " "))];
  if (!h.utilities) unknowns.push("utilities");
  return {
    id: `post-${post.id}`,
    title: h.title ?? `${LABEL[h.listing_type ?? ""] ?? "Home"}${h.location ? ` in ${h.location}` : ""}`,
    photoUrls: post.imageUrls?.length ? post.imageUrls : ["nest:bedroom"],
    monthlyRent: h.rent, currency: "USD",
    // A rent for a room/sublet or a roommate-share post is per person; whole units are per home.
    // Prefer what Muse read from the post; fall back to listing type only when the post is unclear.
    rentBasis: h.rent_basis ?? (ROOM_TYPES.has(h.listing_type ?? "") || r.category === "roommate_request" || /each|per person|\/person/.test(text) ? "person" : "home"),
    leaseType: LABEL[h.listing_type ?? ""] ?? "Home",
    city: h.city ?? "Unknown", neighborhood: hood, latitude: h.latitude ?? 0, longitude: h.longitude ?? 0,
    availableFrom: h.move_in_date ?? "", availableTo: h.available_to ?? "",
    furnished: h.amenities.includes("furnished"),
    bedrooms: h.bedrooms ?? 0, availableRooms: 1,
    sourceId: src.id, sourceName: src.name, sourceUrl: null,
    originalPostText: post.content, facts, unknowns: [...new Set(unknowns)],
    rawPostId: post.id, category: r.category, confidence: r.confidence, extractedBy: r.provider, needsReview: r.needsReview,
  };
}
