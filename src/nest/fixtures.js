const photo = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=85`;
const bedrooms = [
  "nest:bedroom",
  photo("photo-1616594039964-ae9021a400a0"),
  photo("photo-1505693416388-ac5ce068fe85"),
  photo("photo-1615874959474-d609969a20ed"),
  photo("photo-1540518614846-7eded433c457"),
];
/** @type {import('./types').HomeListing[]} */
export const homes = [1350, 1200, 1450, 1300, 1425].map((rent, i) => ({
  id: `home-${i + 1}`,
  title: [
    "Sunny room in South Lake Union",
    "Cozy furnished room near the lake",
    "Light-filled room by Cascade Park",
    "Summer room with a quiet courtyard",
    "Bright room near Westlake",
  ][i],
  photoUrls: [
    bedrooms[i],
    bedrooms[(i + 1) % 5],
    bedrooms[(i + 2) % 5],
    bedrooms[(i + 3) % 5],
  ],
  monthlyRent: rent,
  currency: "USD",
  rentBasis: "person",
  leaseType: "Furnished room",
  city: "Seattle",
  neighborhood: "South Lake Union",
  latitude: 47.623 + i * 0.002,
  longitude: -122.339 + i * 0.002,
  availableFrom: "2027-06-01",
  availableTo: "2027-08-31",
  furnished: true,
  bedrooms: 2,
  availableRooms: 1,
  sourceId: i === 3 ? "marketplace" : "interns",
  sourceName: i === 3 ? "Marketplace" : "Seattle Intern Housing",
  sourceUrl: null,
  originalPostText: `Hi everyone! Subletting my furnished room in South Lake Union for June 1–August 31, 2027. $${rent}/month for one person. Bed and desk included. Message me if you're interested!`,
  facts: { furniture: "Bed and desk included", area: "South Lake Union" },
  unknowns: ["Utilities", "Deposit", "Quiet home", "Commute time"],
}));
/** @type {import('./types').RoommateProfile[]} */
export const roommates = [
  {
    id: "alex",
    name: "Alex",
    photoUrl: "nest:alex",
    introduction: "Moving to Seattle in June",
    dates: ["2027-06-01", "2027-08-31"],
    budgetPerPerson: 1500,
    preferredAreas: ["South Lake Union"],
    explicitLivingPreferences: ["Quiet home"],
    sourceName: "Seattle Intern Housing",
    sourceUrl: null,
    originalPostText:
      "Hi, I'm Alex! I'm moving to Seattle in June for an internship and looking for a roommate through August. My budget is $1,500 each. I prefer a quiet home near South Lake Union. Happy to chat!",
    seekingRoommates: true,
  },
  {
    id: "jordan",
    name: "Jordan",
    photoUrl: "nest:jordan",
    introduction: "Looking near South Lake Union",
    dates: ["2027-06-01", "2027-08-31"],
    budgetPerPerson: 1450,
    preferredAreas: ["South Lake Union"],
    explicitLivingPreferences: ["Quiet home"],
    sourceName: "Seattle Intern Housing",
    sourceUrl: null,
    originalPostText:
      "I'm Jordan, looking for a roommate near South Lake Union this summer. Budget $1,450 per person, June–August. I like a quiet place to recharge after work.",
    seekingRoommates: true,
  },
];
/** @type {import('./types').CommunityEvent[]} */
export const events = [
  {
    id: "market",
    title: "Neighborhood farmers market",
    imageUrl: "nest:market",
    startsAt: "2027-06-05T10:00:00-07:00",
    timezone: "America/Los_Angeles",
    neighborhood: "South Lake Union",
    description:
      "Spend Saturday morning browsing seasonal produce, flowers, and local stalls. An easy way to explore your new neighborhood.",
    interests: ["Markets", "Weekend coffee"],
    sourceUrl: null,
  },
];
/** @type {import('./types').CommunityPerson[]} */
export const people = [
  {
    id: "maya",
    name: "Maya",
    avatarUrl: "nest:maya",
    introduction: "Tennis and weekend coffee",
    neighborhood: "South Lake Union",
    interests: ["Tennis", "Weekend coffee"],
    sourceName: "Seattle Newcomers",
    openToMeeting: true,
  },
  {
    id: "leo",
    name: "Leo",
    avatarUrl: "nest:leo",
    introduction: "Hiking and board games",
    neighborhood: "South Lake Union",
    interests: ["Hiking", "Board games"],
    sourceName: "Seattle Newcomers",
    openToMeeting: true,
  },
];
export const sources = [
  { id: "marketplace", name: "Marketplace" },
  { id: "interns", name: "Seattle Intern Housing" },
  { id: "ubc", name: "UBC Students Housing Network" },
  { id: "seattle-housing", name: "Seattle Housing, Sublets & Roommates" },
];
export const defaultPrompt =
  "I’m moving to Seattle June–August 2027. Find a furnished room under $1,500 per person and someone to share with.";
/** @type {import('./types').SearchGoal} */
export const demoGoal = {
  id: "summer-2027",
  rawPrompt: defaultPrompt,
  intent: "Both",
  city: "Seattle",
  preferredNeighborhoods: ["South Lake Union"],
  startDate: "2027-06-01",
  endDate: "2027-08-31",
  budgetAmount: 1500,
  budgetBasis: "person",
  housingType: "room",
  furnishedRequirement: true,
  roommateCount: 1,
  alreadyHasHome: false,
  mustHaves: ["Location", "Dates", "Budget", "Furnished"],
  preferences: ["Quiet home", "Near Amazon"],
  sourceIds: ["marketplace", "interns", "ubc", "seattle-housing"],
  maxResults: 5,
  cadence: "Daily",
  notificationsEnabled: false,
  updatedAt: "2026-11-12T00:00:00Z",
};
