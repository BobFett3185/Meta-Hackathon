// Additive only: existing rows, user preferences, messages, and saves are untouched.
const fs = require("node:fs");
const path = require("node:path");
const { client, inventory } = require("./mock-db-inventory.cjs");
const { buildCorpus, VERSION } = require("./data/nest-corpus.cjs");
const conflict = {
  fb_group_members: "group_id,user_id",
  fb_reactions: "post_id,user_id",
};
async function run() {
  const db = client();
  const before = await inventory(db);
  const { data: me, error } = await db
    .from("fb_users")
    .select("id")
    .eq("name", "Dhweya Modi")
    .maybeSingle();
  if (error) throw new Error(error.message);
  const corpus = buildCorpus(before.groups, me?.id);
  const planned = Object.fromEntries(
    Object.entries(corpus.rows).map(([table, rows]) => [table, rows.length]),
  );
  console.log(
    JSON.stringify(
      {
        version: VERSION,
        mode: process.argv.includes("--apply") ? "additive insert" : "dry run",
        before: before.counts,
        planned,
      },
      null,
      2,
    ),
  );
  const dir = path.resolve("artifacts/mock-data");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${VERSION}-expected.json`),
    JSON.stringify(corpus.truth, null, 2),
  );
  if (!process.argv.includes("--apply")) return;
  const inserted = {};
  for (const [table, rows] of Object.entries(corpus.rows)) {
    inserted[table] = 0;
    for (let start = 0; start < rows.length; start += 100) {
      const key = conflict[table] || "id";
      const result = await db
        .from(table)
        .upsert(rows.slice(start, start + 100), {
          onConflict: key,
          ignoreDuplicates: true,
        })
        .select(key);
      if (result.error)
        throw new Error(
          `${table}: ${result.error.message}. Earlier batches may have completed; rerun safely to resume.`,
        );
      inserted[table] += result.data.length;
    }
    console.log(
      `${table}: ${inserted[table]} inserted, ${rows.length - inserted[table]} already present`,
    );
  }
  // Check every deterministic ID/composite key, not only global totals.
  for (const [table, rows] of Object.entries(corpus.rows)) {
    if (conflict[table]) {
      const [parent, child] = conflict[table].split(",");
      const parents = [...new Set(rows.map((r) => r[parent]))];
      const found = new Set();
      for (let start = 0; start < parents.length; start += 75) {
        const { data, error } = await db
          .from(table)
          .select(`${parent},${child}`)
          .in(parent, parents.slice(start, start + 75))
          .limit(1000);
        if (error) throw new Error(`${table} verification: ${error.message}`);
        data.forEach((r) => found.add(`${r[parent]}:${r[child]}`));
      }
      if (rows.some((r) => !found.has(`${r[parent]}:${r[child]}`)))
        throw new Error(
          `${table}: missing expected relationships after insert`,
        );
    } else {
      let verified = 0;
      for (let start = 0; start < rows.length; start += 100) {
        const { count, error } = await db
          .from(table)
          .select("id", { head: true, count: "exact" })
          .in(
            "id",
            rows.slice(start, start + 100).map((r) => r.id),
          );
        if (error) throw new Error(`${table} verification: ${error.message}`);
        verified += count;
      }
      if (verified !== rows.length)
        throw new Error(
          `${table}: expected ${rows.length} records, found ${verified}`,
        );
    }
  }
  const after = await inventory(db);
  const report = {
    version: VERSION,
    verifiedAt: new Date().toISOString(),
    before: before.counts,
    inserted,
    after: after.counts,
    allExpectedRecordsVerified: true,
  };
  fs.writeFileSync(
    path.join(dir, `${VERSION}-latest-run.json`),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}
run().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
