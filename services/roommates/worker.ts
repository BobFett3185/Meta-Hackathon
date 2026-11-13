// Background job: turns newly ingested roommate_request posts into roommate profiles.
// Incremental and cheap: each post is judged once (profile or remembered rejection), so a tick with
// nothing new makes no Muse calls. Start it from a long-running server, or standalone via `npm run roommates:watch`.
import { buildRoommateProfiles } from "./build";

export interface WorkerOptions { intervalMs?: number; batchLimit?: number; log?: (msg: string) => void }

export function startRoommateWorker({ intervalMs = 60_000, batchLimit = 30, log = console.log }: WorkerOptions = {}) {
  let busy = false;
  const tick = async () => {
    if (busy) return; // single-flight: never overlap runs (Muse capacity is shared)
    busy = true;
    try {
      const s = await buildRoommateProfiles({ write: true, limit: batchLimit, concurrency: 2 });
      if (s.candidates) log(`[roommates] ${s.candidates} new post(s): ${s.written} profile(s) saved, ${s.skipped} rejected, ${s.transientFailures} to retry`);
    } catch (e) {
      log(`[roommates] run failed: ${(e as Error).message}`);
    } finally {
      busy = false;
    }
  };
  void tick();
  const timer = setInterval(tick, intervalMs);
  return () => clearInterval(timer);
}
