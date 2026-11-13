// Tiny API for the Expo app. Keeps the Muse key server-side; the client only ever sees extracted listings.
// Run: npm run server   (default http://localhost:8787)
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { interpret } from "./interpret";
import { loadData, logQuery, search } from "./search";
import { catalog, getSetup } from "./setup";
import { runIngestion } from "../services/ingestion/run";
import { adminDb, check } from "../services/ingestion/db";
import { createPost } from "./posts";
import { startRoommateWorker } from "../services/roommates/worker";

const PORT = Number(process.env.PORT ?? 8787);

const body = (req: import("node:http").IncomingMessage) => new Promise<any>((ok, no) => {
  let b = ""; req.on("data", (c) => (b += c));
  req.on("end", () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { no(e); } });
});

createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
  const send = (code: number, body: unknown) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
  const url = new URL(req.url ?? "/", "http://x");
  if (url.pathname === "/api/health") return send(200, { ok: true, ai: process.env.AI_PROVIDER !== "mock" && process.env.MUSE_API_KEY ? "muse" : "mock" });
  if (url.pathname === "/api/listings") {
    const data = await loadData();
    return send(200, { generatedAt: data.generatedAt, listings: data.listings, roommates: data.roommates });
  }
  try {
    if (url.pathname === "/api/interpret" && req.method === "POST") {
      const { text, base, userId } = await body(req);
      const cat = await catalog();
      const out = await interpret(String(text ?? ""), base ?? {}, { cities: cat.cities, neighborhoodsByCity: cat.neighborhoodsByCity });
      void logQuery({ userId, kind: "interpret", raw: String(text ?? ""), goal: out.goal, via: out.via, missing: out.missing });
      return send(200, out);
    }
    if (url.pathname === "/api/setup" && req.method === "POST") return send(200, await getSetup((await body(req)).userId));
    if (url.pathname === "/api/search" && req.method === "POST") {
      const { goal, query, userId } = await body(req);
      return send(200, await search(goal, query, userId));
    }
    // Demo helper: publish a post into a group (as if posted on Facebook), then ingest it right away.
    if (url.pathname === "/api/posts" && req.method === "POST") return send(200, await createPost(await body(req)));
    // Trigger incremental ingestion: called by the timer below, a Supabase DB webhook on fb_posts inserts,
    // or any external cron (Vercel Cron, GitHub Actions, pg_cron). Optional shared secret via INGEST_SECRET.
    if (url.pathname === "/api/ingest" && (req.method === "POST" || req.method === "GET")) {
      if (process.env.INGEST_SECRET && req.headers["x-ingest-secret"] !== process.env.INGEST_SECRET && url.searchParams.get("secret") !== process.env.INGEST_SECRET)
        return send(401, { error: "Unauthorized" });
      return send(200, await runIngestion({ reprocess: url.searchParams.get("full") === "1" }));
    }
  } catch (e) { return send(500, { error: (e as Error).message }); }
  send(404, { error: "Not found" });
}).listen(PORT, () => {
  const lan = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => `http://${i!.address}:${PORT}`);
  console.log(`Nest API listening on http://localhost:${PORT}${lan.length ? `  (phones on your Wi-Fi: ${lan.join(", ")})` : ""}`);
});

// Scheduled ingestion. Cheap when nothing is new (one read, no Muse calls). INGEST_INTERVAL_MIN=0 disables.
const every = Number(process.env.INGEST_INTERVAL_MIN ?? 5);
if (every > 0) {
  const tick = () => runIngestion().then((s) => s.new && console.log("[ingest]", s)).catch((e) => console.warn("[ingest] failed:", e.message));
  tick();
  setInterval(tick, every * 60_000);
}

// Roommate profiles: same process as housing ingestion. Judges each new roommate post once (cheap when idle).
startRoommateWorker();

// Instant refresh: Supabase Realtime tells us the moment a post is inserted. Debounced so the post's images
// (inserted just after it) exist before we read. The timer above stays as a safety net.
let debounce: ReturnType<typeof setTimeout> | undefined;
adminDb().channel("nest-new-posts")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "fb_posts" }, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => runIngestion().then((s) => s.new && console.log("[realtime ingest]", s)).catch((e) => console.warn("[realtime ingest] failed:", e.message)), 1500);
  })
  .subscribe((status) => console.log("[realtime]", status));
