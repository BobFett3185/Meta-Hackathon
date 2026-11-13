const same = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
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
      listing.rentBasis === goal.budgetBasis &&
        listing.monthlyRent <= goal.budgetAmount,
      `$${listing.monthlyRent} per ${listing.rentBasis === "person" ? "person" : "home"} per month`,
    ),
    criterion(
      "dates",
      "Available for your dates",
      listing.availableFrom <= goal.startDate &&
        listing.availableTo >= goal.endDate,
      `${listing.availableFrom} to ${listing.availableTo}`,
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
export function matchHomes(homes, goal) {
  if (goal.intent === "Roommate") return [];
  return homes
    .filter((h) => goal.sourceIds.includes(h.sourceId))
    .filter(
      (h) =>
        !goal.housingType ||
        goal.housingType === "either" ||
        (goal.housingType === "room"
          ? /room/i.test(h.leaseType)
          : !/room/i.test(h.leaseType)),
    )
    .map((listing) => ({
      listing,
      listingId: listing.id,
      criteria: evaluateHome(listing, goal),
    }))
    .filter((m) => m.criteria.slice(0, 4).every((c) => c.status === "matched"))
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
