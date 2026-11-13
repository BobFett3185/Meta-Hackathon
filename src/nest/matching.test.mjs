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
    { budgetBasis: "home" },
    { preferredNeighborhoods: ["Capitol Hill"] },
    { budgetAmount: 100 },
    { sourceIds: [] },
    { endDate: "2027-09-30" },
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
test("per-person prices are never treated as whole-home rent", () => {
  assert.equal(matchHomes(homes, demoGoal).length, 5);
  assert.equal(
    matchHomes(homes, { ...demoGoal, budgetBasis: "home" }).length,
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
  assert.deepEqual(
    matchHomes(homes, { ...demoGoal, endDate: "2027-09-30" }),
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
