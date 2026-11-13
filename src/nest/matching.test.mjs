import test from "node:test";
import assert from "node:assert/strict";
import { demoGoal, homes } from "./fixtures.js";
import {
  evaluateHome,
  matchHomes,
  demoHomeMatches,
  selectedMatch,
  toggleSaved,
} from "./matching.js";
test("demo shows labeled samples for incompatible filters without changing the goal", () => {
  for (const patch of [
    { housingType: "entire-home" },
    { budgetBasis: "home", housingType: "either" },
    { preferredNeighborhoods: ["Capitol Hill"] },
    { budgetAmount: 100 },
    { sourceIds: [] },
    { startDate: "2027-09-01", endDate: "2027-09-30" },
  ]) {
    const goal = { ...demoGoal, ...patch };
    const before = JSON.stringify(goal);
    const result = demoHomeMatches(homes, goal);
    assert.equal(result.length, 5);
    assert.ok(result.every(m => m.isDemoSample && !m.summaryReasons.length));
    assert.equal(JSON.stringify(goal), before);
  }
  assert.deepEqual(demoHomeMatches(homes, demoGoal), matchHomes(homes, demoGoal));
  assert.deepEqual(demoHomeMatches(homes, { ...demoGoal, intent: "Roommate" }), []);
  const samples = demoHomeMatches(homes, { ...demoGoal, budgetAmount: 100, maxResults: 2 });
  assert.equal(samples.length, 2);
  assert.equal(samples[0].criteria[0].status, "not-matched");
});
test("a household budget accounts for per-person rent when seeking a household", () => {
  assert.equal(matchHomes(homes, demoGoal).length, 5);
  assert.equal(
    matchHomes(homes, { ...demoGoal, budgetBasis: "home", housingType: "either" }).length,
    0,
  );
});
test("gallery and map resolve a common listing ID, including stale selections", () => {
  const matches = matchHomes(homes, demoGoal);
  assert.equal(selectedMatch(matches, "home-3").listing.id, "home-3");
  assert.equal(selectedMatch(matches, "missing").listing.id, "home-1");
  assert.equal(selectedMatch([], "home-1"), null);
});
test("saved state survives serialization and can be undone", () => {
  const initial = { homes: [], people: [], events: [] };
  const persisted = JSON.parse(
    JSON.stringify(toggleSaved(initial, "homes", "home-1")),
  );
  assert.deepEqual(persisted.homes, ["home-1"]);
  assert.deepEqual(toggleSaved(persisted, "homes", "home-1"), initial);
});
test("unknown preferences are never counted as matched", () => {
  const criteria = evaluateHome(homes[0], demoGoal);
  assert.equal(
    criteria.find((c) => c.criterionId === "utilities").status,
    "unknown",
  );
  assert.equal(
    criteria.find((c) => c.label === "Quiet home").status,
    "unknown",
  );
  assert.equal(
    matchHomes(homes, demoGoal)[0].summaryReasons.includes("Quiet home"),
    false,
  );
});
test("no results preserves budget, dates, and source constraints", () => {
  assert.deepEqual(matchHomes(homes, { ...demoGoal, budgetAmount: 100 }), []);
  assert.deepEqual(matchHomes(homes, { ...demoGoal, sourceIds: [] }), []);
  // A stay no home overlaps at all still returns nothing.
  assert.deepEqual(
    matchHomes(homes, { ...demoGoal, startDate: "2027-09-01", endDate: "2027-09-30" }),
    [],
  );
  assert.equal(demoGoal.budgetAmount, 1500);
});
test("a goal for another city never matches listings from a different city", () => {
  assert.deepEqual(matchHomes(homes, { ...demoGoal, city: "Toronto" }), []);
  assert.deepEqual(
    matchHomes(homes, { ...demoGoal, city: "Toronto", preferredNeighborhoods: [] }),
    [],
  );
});
test("city comparison ignores case and a city-only goal matches the whole city", () => {
  const cityOnly = { ...demoGoal, city: "seattle", preferredNeighborhoods: [] };
  assert.equal(matchHomes(homes, cityOnly).length, 5);
});
test("a named neighborhood still restricts matches within the city", () => {
  assert.deepEqual(
    matchHomes(homes, { ...demoGoal, preferredNeighborhoods: ["Capitol Hill"] }),
    [],
  );
});
test('home type and intent affect listing results without changing the draft', () => {
  assert.equal(matchHomes(homes, {...demoGoal, intent: 'Home', housingType: 'room'}).length, 5);
  assert.equal(matchHomes(homes, {...demoGoal, housingType: 'entire-home'}).length, 0);
  assert.equal(matchHomes(homes, {...demoGoal, housingType: 'either'}).length, 5);
  assert.equal(matchHomes(homes, {...demoGoal, intent: 'Roommate'}).length, 0);
  assert.equal(demoGoal.housingType, 'room');
});
test("a per-person budget also covers a whole home that costs no more", () => {
  const studio = { ...homes[0], id: "studio", rentBasis: "home", leaseType: "Studio", monthlyRent: 1400 };
  const goal = { ...demoGoal, housingType: "either" };
  assert.equal(matchHomes([studio], goal).length, 1);
  assert.equal(matchHomes([{ ...studio, monthlyRent: 1600 }], goal).length, 0);
});
test("open-ended and undated posts are not dropped, and undated ones rank last", () => {
  const openEnded = { ...homes[0], id: "open", availableTo: "" };
  const undated = { ...homes[0], id: "undated", availableFrom: "", availableTo: "" };
  const matches = matchHomes([undated, openEnded], demoGoal);
  assert.deepEqual(matches.map((m) => m.listingId), ["open", "undated"]);
  assert.equal(matches[1].criteria.find((c) => c.criterionId === "dates").status, "unknown");
  // Starts a month into the stay: shown, but only as a partial-dates match.
  assert.equal(matchHomes([{ ...openEnded, availableFrom: "2027-07-01" }], demoGoal)[0].partialDates, true);
});
test("neighborhood names match regardless of punctuation and case", () => {
  const goal = { ...demoGoal, preferredNeighborhoods: ["south lake-union"] };
  assert.equal(matchHomes(homes, goal).length, 5);
});
test("homes covering only part of the stay are shown after full matches and never called a dates match", () => {
  const longStay = { ...demoGoal, endDate: "2027-09-30" };
  const partial = matchHomes(homes, longStay);
  assert.equal(partial.length, 5);
  assert.ok(partial.every((m) => m.partialDates && !m.summaryReasons.includes("Available for part of your dates")));
  assert.equal(partial[0].criteria.find((c) => c.criterionId === "dates").status, "not-matched");
  const open = { ...homes[0], id: "open", availableTo: "" };
  const short = { ...homes[0], id: "short", availableTo: "2027-06-30" };
  const mixed = matchHomes([short, homes[1], open], longStay);
  assert.deepEqual(mixed.map((m) => [m.listingId, !!m.partialDates]), [["open", false], [homes[1].id, true], ["short", true]]);
  assert.ok(matchHomes(homes, demoGoal).every((m) => !m.partialDates));
});
test("a whole-home budget covers a room when the per-person price times the household fits", () => {
  const room = { ...homes[0], id: "room", monthlyRent: 1000, rentBasis: "person" };
  const solo = { ...demoGoal, intent: "Home", budgetBasis: "home", budgetAmount: 2000, roommateCount: null, housingType: "either" };
  assert.equal(matchHomes([room], solo).length, 1);
  assert.equal(matchHomes([{ ...room, monthlyRent: 2100 }], solo).length, 0);
  const pair = { ...solo, intent: "Both", roommateCount: 1 };
  assert.equal(matchHomes([room], pair).length, 1);
  assert.equal(matchHomes([room], { ...pair, roommateCount: 2 }).length, 0);
});
test('Both keeps a single-room housing budget independent of desired roommates',()=>{
  const goal={...demoGoal,intent:'Both',housingType:'room',budgetBasis:'home',budgetAmount:2150,roommateCount:1};
  const room={...homes[0],monthlyRent:1375,rentBasis:'person',leaseType:'Private room'};
  assert.equal(matchHomes([room],goal).length,1);
  assert.equal(matchHomes([room],{...goal,roommateCount:3}).length,1);
  assert.equal(matchHomes([{...room,monthlyRent:2200}],goal).length,0);
  assert.deepEqual(matchHomes(homes,goal).map(m=>m.listingId),matchHomes(homes,{...goal,intent:'Home'}).map(m=>m.listingId));
});
