import test from "node:test";
import assert from "node:assert/strict";
import { emptyProfile, profileFromGoal, prepareProfile } from "./profileData.js";
import { demoGoal, roommates } from "./fixtures.js";
import { demoRoommateMatches } from "./matching.js";

test("goal transfer preserves self-description and does not infer traits", () => {
  const goal = { ...demoGoal, preferences: ["Quiet home"], rawPrompt: "I want a tidy roommate" };
  const profile = profileFromGoal({ ...emptyProfile, aboutMe: "I work night shifts", lookingFor: "Early riser", appearance: { color: "rose", accessory: "leaf" } }, goal);
  assert.equal(profile.aboutMe, "I work night shifts");
  assert.equal(profile.lookingFor, "Early riser");
  assert.equal(profile.originalText, goal.rawPrompt);
  assert.equal(profile.housing.alreadyHasHome, false);
  assert.deepEqual(profile.appearance, { color: "rose", accessory: "leaf" });
  assert.equal(profileFromGoal(null, goal).aboutMe, "");
});
test("saved profile keeps private discovery off, identifies owner, and reports local persistence", () => {
  const saved = prepareProfile({ ...emptyProfile, introduction: " Hello! ", discoveryOptIn: true }, "user-1");
  assert.equal(saved.introduction, "Hello!");
  assert.equal(saved.userId, "user-1");
  assert.equal(saved.discoveryOptIn, false);
  assert.equal(saved.persistence, "local");
  assert.throws(() => prepareProfile(emptyProfile, "user-1"), /introduction/);
});
test("roommate demo routes independently and retains honest criteria for fallback samples", () => {
  assert.equal(demoRoommateMatches(roommates, { ...demoGoal, intent: "Home" }).length, 0);
  const exact = demoRoommateMatches(roommates, { ...demoGoal, intent: "Roommate" });
  assert.equal(exact.length, 2);
  assert.ok(exact.every(p => !p.isDemoSample));
  const samples = demoRoommateMatches(roommates, { ...demoGoal, intent: "Roommate", budgetAmount: 100 });
  assert.equal(samples.length, 2);
  assert.ok(samples.every(p => p.isDemoSample && p.criteria.find(c => c.criterionId === "budget").status === "not-matched"));
});
