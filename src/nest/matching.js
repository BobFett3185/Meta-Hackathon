const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const same = (a, b) => norm(a) === norm(b);
// Compare what the searcher would actually pay.
// - Same basis: compare directly.
// - Per-person budget, whole-home price: the whole home fits if it costs no more than the budget.
// - Whole-home budget, per-person price: the household pays the price once per person. Someone searching
//   only for housing is a household of one, so a room within their budget fits.
const householdSize = (goal) => (goal.intent === "Home" ? 1 : 1 + (goal.roommateCount || 1));
const withinBudget = (listing, goal) =>
  listing.rentBasis === goal.budgetBasis || goal.budgetBasis === "person"
    ? listing.monthlyRent <= goal.budgetAmount
    : listing.monthlyRent * householdSize(goal) <= goal.budgetAmount;
// null = the post states no dates at all. A post with no end date is open-ended.
const coversDates = (listing, goal) =>
  !listing.availableFrom && !listing.availableTo
    ? null
    : (!listing.availableFrom || listing.availableFrom <= goal.startDate) &&
      (!listing.availableTo || listing.availableTo >= goal.endDate);
// Days of the stay a dated post is available for (0 when it never overlaps).
const overlapDays = (listing, goal) => {
  const from = listing.availableFrom && listing.availableFrom > goal.startDate ? listing.availableFrom : goal.startDate;
  const to = listing.availableTo && listing.availableTo < goal.endDate ? listing.availableTo : goal.endDate;
  return Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1) || 0;
};
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
      coversDates(listing, goal) === false && overlapDays(listing, goal)
        ? "Available for part of your dates"
        : "Available for your dates",
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
            ? !/room/i.test(h.leaseType) && h.rentBasis !== "person" // a per-person sublet is a room, not a whole home
            : true,
    )
    .map((listing) => ({
      listing,
      listingId: listing.id,
      criteria: evaluateHome(listing, goal),
    }))
    .filter((m) => m.criteria.slice(0, 4).every((c) => c.status !== "not-matched" || c.criterionId === "dates"))
    .map((m) => ({ ...m, covered: overlapDays(m.listing, goal), full: m.criteria[1].status !== "not-matched" }))
    // Budget, area and furnishing must not conflict with the goal, and the home must be available for at least
    // part of the stay. Homes that cover the whole stay come first; ones that cover only part of it follow,
    // flagged partialDates so the app never calls them a dates match. Longest coverage first.
    .filter((m) => m.full || m.covered > 0)
    .sort((a, b) => b.full - a.full || (a.full ? confirmed(b) - confirmed(a) : b.covered - a.covered))
    .slice(0, goal.maxResults)
    .map(({ covered, full, ...m }) => (full ? m : { ...m, partialDates: true }))
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

export function demoRoommateMatches(people, goal) {
  if (goal.intent === "Home") return [];
  const rows = people
    .filter((p) => p.seekingRoommates)
    .map((p) => {
      const criterion = (id, label, matched, evidence) => ({
        criterionId: id,
        label,
        status:
          matched === null ? "unknown" : matched ? "matched" : "not-matched",
        evidence,
        explanation: evidence,
      });
      return {
        ...p,
        criteria: [
          criterion(
            "dates",
            "Your dates overlap",
            p.dates[0] <= goal.endDate && p.dates[1] >= goal.startDate,
            `${p.dates[0]} to ${p.dates[1]}`,
          ),
          criterion(
            "budget",
            "Similar housing budget",
            goal.budgetBasis === "person" &&
              p.budgetPerPerson <= goal.budgetAmount,
            `$${p.budgetPerPerson} per person`,
          ),
          criterion(
            "area",
            "Shared preferred neighborhood",
            p.preferredAreas.some((a) =>
              goal.preferredNeighborhoods.includes(a),
            ),
            p.preferredAreas.join(", "),
          ),
          criterion(
            "quiet",
            "Also prefers a quiet home",
            goal.preferences.includes("Quiet home") &&
              p.explicitLivingPreferences.includes("Quiet home")
              ? true
              : null,
            p.originalPostText,
          ),
        ],
      };
    });
  const exact = rows.filter(
    (p) =>
      goal.sourceIds.includes("interns") &&
      p.criteria.slice(0, 3).every((c) => c.status === "matched"),
  );
  return (
    exact.length ? exact : rows.map((p) => ({ ...p, isDemoSample: true }))
  ).slice(0, goal.maxResults);
}
