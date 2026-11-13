export type Intent = "Home" | "Roommate" | "Both";
export interface SearchGoal {
  id: string;
  rawPrompt: string;
  intent: Intent;
  city: string;
  preferredNeighborhoods: string[];
  startDate: string;
  endDate: string;
  budgetAmount: number;
  budgetBasis: "person" | "home";
  housingType: string;
  furnishedRequirement: boolean;
  roommateCount: number | null;
  alreadyHasHome: boolean | null;
  mustHaves: string[];
  preferences: string[];
  sourceIds: string[];
  maxResults: number;
  cadence: "Manual" | "Daily" | "Weekly";
  notificationsEnabled: boolean;
  updatedAt: string;
}
export interface HomeListing {
  id: string;
  title: string;
  photoUrls: string[];
  monthlyRent: number;
  currency: string;
  rentBasis: "person" | "home";
  leaseType: string;
  city: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  availableFrom: string;
  availableTo: string;
  furnished: boolean;
  bedrooms: number;
  availableRooms: number;
  sourceId: string;
  sourceName: string;
  sourceUrl: string | null;
  originalPostText: string;
  facts: Record<string, string>;
  unknowns: string[];
}
export interface CriterionEvaluation {
  criterionId: string;
  label: string;
  status: "matched" | "not-matched" | "unknown";
  explanation: string;
  evidence: string;
}
export interface HomeMatch {
  listing: HomeListing;
  listingId: string;
  criteria: CriterionEvaluation[];
  summaryReasons: string[];
}
export interface RoommateProfile {
  id: string;
  name: string;
  photoUrl: string;
  introduction: string;
  dates: string[];
  budgetPerPerson: number;
  preferredAreas: string[];
  explicitLivingPreferences: string[];
  sourceName: string;
  sourceUrl: string | null;
  originalPostText: string;
  seekingRoommates: boolean;
}
export interface CommunityEvent {
  id: string;
  title: string;
  imageUrl: string | null;
  city: string;
  endsAt?: string | null;
  venue?: string | null;
  category: string;
  price: number | null;
  currency: string | null;
  sourceId: string;
  sourceName: string;
  postId: string;
  originalPostText: string;
  status: 'scheduled' | 'cancelled';
  startsAt: string;
  timezone: string;
  neighborhood: string | null;
  description: string;
  interests: string[];
  sourceUrl: string | null;
}
export interface CommunityPerson {
  id: string;
  name: string;
  avatarUrl: string;
  introduction: string;
  neighborhood: string;
  interests: string[];
  sourceName: string;
  openToMeeting: boolean;
}
