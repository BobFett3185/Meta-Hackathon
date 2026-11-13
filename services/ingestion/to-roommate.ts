import type { IngestedPost, IngestPost } from "./ingest";
import { sourceFor } from "./to-listing";

/** Matches src/nest/types.d.ts RoommateProfile. Built only from roommate_request posts. */
export interface RoommateDTO {
  id: string; name: string; photoUrl: string; introduction: string; dates: string[]; budgetPerPerson: number;
  city: string; preferredAreas: string[]; explicitLivingPreferences: string[]; sourceId: string; sourceName: string;
  sourceUrl: string | null; originalPostText: string; seekingRoommates: boolean;
  rawPostId: string; extractedBy: "muse" | "mock";
}

export function toRoommate(post: IngestPost, r: IngestedPost): RoommateDTO | null {
  const h = r.housing;
  if (r.category !== "roommate_request" || !h || h.rent == null || r.duplicateOf) return null;
  const src = sourceFor(post);
  return {
    id: `rm-${post.id}`, name: post.authorName ?? "Group member", photoUrl: post.authorAvatar ?? "",
    introduction: r.summary, dates: [h.move_in_date ?? "", h.available_to ?? ""],
    budgetPerPerson: h.rent, city: h.city ?? "Unknown", preferredAreas: h.location ? [h.location] : [],
    explicitLivingPreferences: h.living_preferences, sourceId: src.id, sourceName: src.name, sourceUrl: null,
    originalPostText: post.content, seekingRoommates: true, rawPostId: post.id, extractedBy: r.provider,
  };
}
