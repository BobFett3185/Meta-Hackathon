/** Limited fixture interpreter: only explicit, supported Seattle summer searches. */
export function interpretPrompt(rawPrompt, base) {
  const text = rawPrompt.toLowerCase();
  if (!text.trim())
    return {
      goal: { ...base, rawPrompt },
      missing: "Tell Nest where you are moving, your dates, and your budget.",
    };
  if (!/seattle/.test(text))
    return {
      goal: { ...base, rawPrompt },
      missing:
        "This demo supports Seattle. Include Seattle in your goal to search these fixtures.",
    };
  const amount = text.match(
    /\$\s*([\d,]+)|(?:under|budget(?: of)?|up to)\s*([\d,]+)/,
  );
  if (!amount)
    return {
      goal: { ...base, rawPrompt },
      missing: "Include your budget, for example $1,500 per person.",
    };
  if (!/(per person|each|total|whole home)/.test(text))
    return {
      goal: { ...base, rawPrompt },
      missing:
        "Is that budget per person or for the whole home? Add it to your goal.",
    };
  if (!/jun/.test(text) || !/aug/.test(text) || !/2027/.test(text))
    return {
      goal: { ...base, rawPrompt },
      missing:
        "This demo supports June–August 2027. Include those dates to continue.",
    };
  const namedAreas = [
    ["capitol hill", "Capitol Hill"],
    ["south lake union", "South Lake Union"],
    ["slu", "South Lake Union"],
  ]
    .filter(([name]) => new RegExp(`\\b${name}\\b`).test(text))
    .map(([, name]) => name);
  if (
    /ballard|fremont|belltown|queen anne|university district|west seattle/.test(
      text,
    )
  )
    return {
      goal: { ...base, rawPrompt },
      missing:
        "This demo supports South Lake Union and Capitol Hill. Edit the neighborhood in your goal to continue.",
    };
  return {
    goal: {
      ...base,
      rawPrompt,
      city: "Seattle",
      preferredNeighborhoods: namedAreas.length
        ? [...new Set(namedAreas)]
        : base.preferredNeighborhoods,
      startDate: "2027-06-01",
      endDate: "2027-08-31",
      budgetAmount: Number((amount[1] || amount[2]).replaceAll(",", "")),
      budgetBasis: /total|whole home/.test(text) ? "home" : "person",
      furnishedRequirement: /unfurnished|not furnished/.test(text)
        ? false
        : /furnished/.test(text)
          ? true
          : base.furnishedRequirement,
      preferences: /quiet/.test(text)
        ? [...new Set([...base.preferences, "Quiet home"])]
        : base.preferences,
    },
    missing: null,
  };
}
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
      "In your preferred neighborhood",
      goal.city === "Seattle" &&
        goal.preferredNeighborhoods.includes(listing.neighborhood),
      listing.neighborhood,
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
  return homes
    .filter((h) => goal.sourceIds.includes(h.sourceId))
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
