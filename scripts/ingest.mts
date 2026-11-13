// Incremental ingestion: sends only posts Muse hasn't seen to the AI and writes results to Supabase.
//   npm run ingest              all unseen posts
//   npm run ingest -- --full    wipe nest_* derived tables and re-analyze everything
import { runIngestion, rebuildDerived } from "../services/ingestion/run";
//   npm run ingest -- --rebuild re-run dedupe + mapping on stored Muse output (no Muse calls)
if (process.argv.includes("--rebuild")) { console.log(await rebuildDerived()); process.exit(0); }
const t0 = Date.now();
const summary = await runIngestion({
  reprocess: process.argv.includes("--full"),
  limit: Infinity,
  onProgress: (done, total) => {
    if (done % 10 === 0 || done === total) console.log(`  analyzed ${done}/${total}  (${Math.round((Date.now() - t0) / 1000)}s)`);
  },
});
console.log(summary);
