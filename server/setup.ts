// Everything the app needs to start, derived from Supabase (no hardcoded cities, groups, or defaults).
import { adminDb, check } from "../services/ingestion/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const same = (a?: string | null, b?: string | null) => (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Cities and neighborhoods that actually exist in the extracted data, most common first. */
export async function catalog() {
  const rows: any[] = check(await adminDb().from("nest_listings").select("city,neighborhood,monthly_rent,rent_basis,source_id"), "read catalog");
  const cities: Record<string, number> = {};
  const hoods: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    if (!r.city || r.city === "Unknown") continue;
    cities[r.city] = (cities[r.city] ?? 0) + 1;
    if (r.neighborhood && r.neighborhood !== "Unknown") (hoods[r.city] ||= {})[r.neighborhood] = (hoods[r.city][r.neighborhood] ?? 0) + 1;
  }
  const rank = (o: Record<string, number>) => Object.keys(o).sort((a, b) => o[b] - o[a]);
  return { rows, cities: rank(cities), neighborhoodsByCity: Object.fromEntries(Object.entries(hoods).map(([c, h]) => [c, rank(h)])) };
}

export async function getSetup(userId?: string) {
  const db = adminDb();
  const cat = await catalog();
  const uid = userId && UUID.test(userId) ? userId : null;

  const [groups, members, user, roommates]: any[] = await Promise.all([
    db.from("fb_groups").select("id,name").then((r) => check(r, "read groups")),
    uid ? db.from("fb_group_members").select("group_id").eq("user_id", uid).then((r) => check(r, "read memberships")) : [],
    uid ? db.from("fb_users").select("name,location").eq("id", uid).maybeSingle().then((r) => check(r, "read user")) : null,
    db.from("nest_roommates").select("source_id").then((r) => check(r, "read roommates")),
  ]);

  // Sources = groups the user belongs to that actually contain housing/roommate posts.
  const withData = new Set<string>([...cat.rows.map((r) => r.source_id), ...roommates.map((r: any) => r.source_id)]);
  const mine = new Set<string>(members.map((m: any) => m.group_id));
  let sources = groups.filter((g: any) => withData.has(g.id) && mine.has(g.id));
  if (!sources.length) sources = groups.filter((g: any) => withData.has(g.id));

  // Default city: the user's profile city if we have data for it, else the city with the most listings.
  const profileCity = (user?.location ?? "").split(",")[0];
  const city = cat.cities.find((c) => same(c, profileCity)) ?? cat.cities[0] ?? profileCity ?? "";
  const inCity = cat.rows.filter((r) => same(r.city, city));
  const person = inCity.filter((r) => r.rent_basis === "person");
  // The default is the searcher's own monthly share, independent of listing mix.
  // Whole-home budgets remain an explicit intake choice.
  const basis = "person";
  const rents = inCity.filter((r) => r.rent_basis === basis).map((r) => r.monthly_rent).sort((a, b) => a - b);
  const median = rents.length ? rents[Math.floor(rents.length / 2)] : 0;
  const start = new Date(), end = new Date(); end.setMonth(end.getMonth() + 3);

  return {
    me: uid ? { id: uid, name: user?.name ?? null } : null,
    cities: cat.cities,
    neighborhoodsByCity: cat.neighborhoodsByCity,
    sources,
    defaultGoal: {
      id: "default", rawPrompt: "", intent: "Both", city, preferredNeighborhoods: [], startDate: iso(start), endDate: iso(end),
      budgetAmount: median, budgetBasis: basis, housingType: "any", furnishedRequirement: false, roommateCount: null,
      alreadyHasHome: null, mustHaves: ["Location", "Dates", "Budget"], preferences: [], sourceIds: sources.map((s: any) => s.id),
      maxResults: 5, cadence: "Daily", notificationsEnabled: false, updatedAt: new Date().toISOString(),
    },
  };
}
