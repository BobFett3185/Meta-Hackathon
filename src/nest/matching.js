const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const same = (a, b) => norm(a) === norm(b);
// A per-person budget also covers a whole home that costs no more than it. A whole-home budget never
// covers a per-person price, because the total for the home is unknown.
const withinBudget = (listing, goal) =>
  listing.monthlyRent <= goal.budgetAmount &&
  (listing.rentBasis === goal.budgetBasis || (goal.budgetBasis === "person" && listing.rentBasis === "home"));
// null = the post states no dates at all. A post with no end date is open-ended.
const coversDates = (listing, goal) =>
  !listing.availableFrom && !listing.availableTo
    ? null
    : (!listing.availableFrom || listing.availableFrom <= goal.startDate) &&
      (!listing.availableTo || listing.availableTo >= goal.endDate);
export function evaluateHome(listing, goal) {
  const criterion = (criterionId, label, matched, evidence) => ({
    criterionId,
    label,
    status: matched === null ? "unknown" : matched ? "matched" : "not-matched",
    explanation: evidence,
    evidence,
  });
  return [
    criterion(
      "budget",
      "Within your budget",
      withinBudget(listing, goal),
      `$${listing.monthlyRent} per ${listing.rentBasis === "person" ? "person" : "home"} per month`,
    ),
    criterion(
      "dates",
      "Available for your dates",
      coversDates(listing, goal),
      !listing.availableFrom && !listing.availableTo
        ? "Dates not stated in the original post"
        : `${listing.availableFrom || "Available now"} to ${listing.availableTo || "no end date stated"}`,
    ),
    criterion(
      "area",
      goal.preferredNeighborhoods.length
        ? "In your preferred neighborhood"
        : "In your city",
      same(goal.city, listing.city) &&
        (!goal.preferredNeighborhoods.length ||
          goal.preferredNeighborhoods.some((n) => same(n, listing.neighborhood))),
      [listing.neighborhood, listing.city]
        .filter((x) => x && x !== "Unknown")
        .join(", ") || "Location not stated",
    ),
    criterion(
      "furnished",
      "Furnished",
      !goal.furnishedRequirement || listing.furnished,
      listing.facts.furniture,
    ),
    ...goal.preferences.map((p, i) =>
      criterion(
        `preference-${i}`,
        p,
        null,
        "Not specified in the original post",
      ),
    ),
    criterion(
      "utilities",
      "Utilities and deposit",
      null,
      "Not specified in the original post",
    ),
  ];
}
const confirmed = (m) => m.criteria.slice(0, 4).filter((c) => c.status === "matched").length;
export function matchHomes(homes, goal) {
  if (goal.intent === "Roommate") return [];
  return homes
    .filter((h) => goal.sourceIds.includes(h.sourceId))
    .filter(
      // Only the two explicit choices narrow the search; "either", "any" or anything else shows all.
      (h) =>
        goal.housingType === "room"
          ? /room/i.test(h.leaseType)
          : goal.housingType === "entire-home"
            ? !/room/i.test(h.leaseType)
            : true,
    )
    .map((listing) => ({
      listing,
      listingId: listing.id,
      criteria: evaluateHome(listing, goal),
    }))
    // Budget, dates, area and furnishing must not conflict with the goal. Posts that leave dates out stay in,
    // marked unknown, and rank below the ones that confirm every criterion.
    .filter((m) => m.criteria.slice(0, 4).every((c) => c.status !== "not-matched"))
    .sort((a, b) => confirmed(b) - confirmed(a))
    .slice(0, goal.maxResults)
    .map((m) => ({
      ...m,
      summaryReasons: m.criteria
        .filter((c) => c.status === "matched")
        .slice(0, 3)
        .map((c) => c.label),
    }));
}
// Keep the hardcoded demo browsable without pretending samples satisfy a search.
export function demoHomeMatches(homes, goal) {
  const matches = matchHomes(homes, goal);
  if (matches.length || goal.intent === "Roommate") return matches;
  return homes.slice(0, goal.maxResults).map((listing) => ({
    listing,
    listingId: listing.id,
    isDemoSample: true,
    criteria: evaluateHome(listing, goal),
    summaryReasons: [],
  }));
}
export function toggleSaved(saved, kind, id) {
  const items = saved[kind] || [];
  return {
    ...saved,
    [kind]: items.includes(id) ? items.filter((x) => x !== id) : [...items, id],
  };
}
export function selectedMatch(matches, id) {
  return matches.find((m) => m.listingId === id) || matches[0] || null;
}
