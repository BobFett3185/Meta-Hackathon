import test from "node:test";
import assert from "node:assert/strict";
import { demoGoal, homes } from "./fixtures.js";
import {
  interpretPrompt,
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
test("interpreting a changed budget preserves untouched preferences and sources", () => {
  const base = {
    ...demoGoal,
    preferences: ["Near Amazon"],
    sourceIds: ["interns"],
    cadence: "Weekly",
  };
  const { goal, missing } = interpretPrompt(
    "Seattle June–August 2027, under $1,400 per person",
    base,
  );
  assert.equal(missing, null);
  assert.equal(goal.budgetAmount, 1400);
  assert.deepEqual(goal.preferences, base.preferences);
  assert.deepEqual(goal.sourceIds, base.sourceIds);
  assert.equal(goal.cadence, "Weekly");
});
test("per-person prices are never treated as whole-home rent", () => {
  assert.equal(matchHomes(homes, demoGoal).length, 5);
  assert.equal(
    matchHomes(homes, { ...demoGoal, budgetBasis: "home" }).length,
    0,
  );
  assert.ok(
    interpretPrompt("Seattle June–August 2027 under $1500", demoGoal).missing,
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
test("unsupported prompts keep their original input and request clarification", () => {
  const input = "Find a place in Toronto";
  const result = interpretPrompt(input, demoGoal);
  assert.equal(result.goal.rawPrompt, input);
  assert.ok(result.missing);
});
test("explicit neighborhoods replace the default instead of silently matching another area", () => {
  const result = interpretPrompt(
    "Seattle Capitol Hill June–August 2027 under $1500 per person",
    demoGoal,
  );
  assert.deepEqual(result.goal.preferredNeighborhoods, ["Capitol Hill"]);
  assert.deepEqual(matchHomes(homes, result.goal), []);
  assert.ok(
    interpretPrompt(
      "Seattle Ballard June–August 2027 under $1500 per person",
      demoGoal,
    ).missing,
  );
});
test('home type and intent affect listing results without changing the draft', () => {
  assert.equal(matchHomes(homes, {...demoGoal, intent: 'Home', housingType: 'room'}).length, 5);
  assert.equal(matchHomes(homes, {...demoGoal, housingType: 'entire-home'}).length, 0);
  assert.equal(matchHomes(homes, {...demoGoal, housingType: 'either'}).length, 5);
  assert.equal(matchHomes(homes, {...demoGoal, intent: 'Roommate'}).length, 0);
  assert.equal(demoGoal.housingType, 'room');
});
