const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCorpus, id } = require("./nest-corpus.cjs");
const names = [
  "Seattle Intern Housing Summer 2027",
  "Seattle Housing, Sublets & Roommates",
  "Seattle Apartments and Housing",
  "UBC, Housing, Room Rentals, Sublet Roommate",
  "Young Professionals in Seattle",
  "Amazon Interns 2027",
  "Seattle Furniture Marketplace",
  "Vancouver Marketplace",
];
const groups = names.map((name, i) => ({ id: id("test-group", i), name }));
const { rows, truth } = buildCorpus(groups, id("demo", 0));
test("corpus has deterministic unique identities and substantial source coverage", () => {
  assert.deepEqual(buildCorpus(groups, id("demo", 0)), { rows, truth });
  assert.equal(rows.fb_users.length, 120);
  assert.equal(new Set(rows.fb_users.map((r) => r.name)).size, 120);
  assert.equal(rows.fb_posts.length, 312);
  assert.equal(rows.fb_marketplace_listings.length, 180);
  for (const [table, list] of Object.entries(rows))
    if (list[0]?.id)
      assert.equal(new Set(list.map((r) => r.id)).size, list.length, table);
});
test("foreign keys are complete and each post author belongs to its group", () => {
  const users = new Set(rows.fb_users.map((r) => r.id));
  const posts = new Set(rows.fb_posts.map((r) => r.id));
  const listings = new Set(rows.fb_marketplace_listings.map((r) => r.id));
  const memberships = new Set(
    rows.fb_group_members.map((r) => `${r.group_id}:${r.user_id}`),
  );
  rows.fb_posts.forEach((p) => {
    assert.ok(users.has(p.author_id));
    assert.ok(memberships.has(`${p.group_id}:${p.author_id}`));
  });
  rows.fb_post_images.forEach((r) => assert.ok(posts.has(r.post_id)));
  rows.fb_comments.forEach((r) => {
    assert.ok(posts.has(r.post_id));
    assert.ok(users.has(r.author_id));
  });
  rows.fb_marketplace_listings.forEach((r) =>
    assert.ok(users.has(r.seller_id)),
  );
  rows.fb_marketplace_images.forEach((r) =>
    assert.ok(listings.has(r.listing_id)),
  );
});
test("AI fixtures cover unknowns, duplicates, budget basis, statuses and negative examples", () => {
  const houses = truth.sources.filter((s) => s.category === "housing");
  for (const predicate of [
    (s) => s.expected.monthlyRent === null,
    (s) => s.expected.budgetBasis === null,
    (s) => s.expected.budgetBasis === "home",
    (s) => s.expected.budgetBasis === "person",
    (s) => s.expected.duplicateOf,
    (s) => s.expected.commentCorrection,
    (s) => s.expected.status === "unavailable",
    (s) => s.expected.currency === "CAD",
  ])
    assert.ok(houses.some(predicate));
  assert.equal(
    truth.sources.filter((s) => s.category === "roommate").length,
    72,
  );
  assert.equal(
    truth.sources.filter((s) => s.category === "discussion").length,
    20,
  );
  assert.ok(
    rows.fb_marketplace_listings.some(
      (r) => r.price === 0 && r.category !== "Housing",
    ),
  );
  assert.ok(rows.fb_marketplace_listings.some((r) => r.status === "pending"));
});
test("new people require explicit source opt-in, not just group membership", () => {
  assert.equal(truth.people.filter((p) => p.seekingRoommates).length, 72);
  assert.equal(truth.people.filter((p) => p.openToMeeting).length, 48);
  truth.people.forEach((p) =>
    assert.ok(truth.sources.some((s) => s.expected.personId === p.id)),
  );
});
test("missing groups fail before generating writable data", () =>
  assert.throws(() => buildCorpus([]), /Required existing group missing/));
