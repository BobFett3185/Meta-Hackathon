// Incremental ingestion: sends only posts Muse hasn't seen to the AI and writes results to Supabase.
//   npm run ingest              new posts only
//   npm run ingest -- --full    wipe nest_* derived tables and re-analyze everything
import { runIngestion } from "../services/ingestion/run";
const summary = await runIngestion({ reprocess: process.argv.includes("--full") });
console.log(summary);
