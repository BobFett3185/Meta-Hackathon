import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { ingestPosts } from "../services/ingestion/ingest";
import { toHomeListing } from "../services/ingestion/to-listing";

process.env.AI_PROVIDER = "mock";
test("reprocessing a post does not make it its own duplicate", async () => {
  const post = { id: "original", authorId: "author", content: "1br apartment in SLU Seattle $2100/mo, June 1" };
  const first = await ingestPosts([post]);
  assert.ok(first.posts[0].housing);
  const again = await ingestPosts([post], [{ rawPostId: post.id, housing: first.posts[0].housing!, text: post.content, authorId: post.authorId }]);
  assert.equal(again.posts[0].duplicateOf, null);
  const repost = await ingestPosts([{ ...post, id: "repost" }], [{ rawPostId: post.id, housing: first.posts[0].housing!, text: post.content, authorId: post.authorId }]);
  assert.equal(repost.posts[0].duplicateOf, post.id);
});

test("roommate requests are not available homes", async () => {
  const post = { id: "roommate", content: "Looking for a roommate in SLU Seattle, budget $1500 per person" };
  const result = await ingestPosts([post]);
  assert.equal(result.posts[0].category, "roommate_request");
  assert.equal(toHomeListing(post, result.posts[0]), null);
});

test("API handles bad requests, database failures and occupied ports", { timeout: 30_000 }, async () => {
  const reservation = createServer().listen(0);
  await once(reservation, "listening");
  const port = (reservation.address() as { port: number }).port;
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  const env = { ...process.env, PORT: String(port), EXPO_PUBLIC_SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "", INGEST_INTERVAL_MIN: "0", INGEST_REALTIME: "0" };
  const args = ["--import", "tsx", "server/index.mts"];
  const server = spawn(process.execPath, args, { env, stdio: "pipe" });
  const exited = once(server, "exit");
  try {
    await new Promise<void>((resolve, reject) => {
      server.stdout.on("data", (chunk) => { if (String(chunk).includes("Nest API listening")) resolve(); });
      server.once("error", reject);
      server.once("exit", () => reject(new Error("API exited before listening")));
    });
    const url = `http://localhost:${port}`;
    assert.equal((await fetch(url + "/api/health")).status, 200);
    const failed = await fetch(url + "/api/listings");
    assert.equal(failed.status, 500);
    assert.match((await failed.json()).error, /Missing/);
    for (const body of ["{", "null", "[]", "{}", '{"goal":{}}']) {
      assert.equal((await fetch(url + "/api/search", { method: "POST", body })).status, 400);
    }
    assert.equal((await fetch(url + "/api/health")).status, 200);
    const duplicate = spawn(process.execPath, args, { env, stdio: "pipe" });
    let error = "";
    duplicate.stderr.on("data", (chunk) => { error += chunk; });
    assert.equal((await once(duplicate, "exit"))[0], 1);
    assert.match(error, /already in use/);
    assert.doesNotMatch(error, /Unhandled 'error'/);
    // An API failure must also stop Expo and propagate the failed exit status.
    const dev = spawn(process.execPath, ["scripts/dev.cjs", "--port", "0"], { env: { ...env, CI: "1" }, stdio: "pipe" });
    dev.stdout.resume();
    dev.stderr.resume();
    assert.equal((await once(dev, "exit"))[0], 1);
  } finally {
    server.kill();
    await exited;
  }
});
