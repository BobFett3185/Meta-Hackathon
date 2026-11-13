// Standalone worker: keeps roommate profiles up to date as new posts are ingested.
//   npm run roommates:watch
// (Once branches are merged this is started from the Nest server instead.)
import { startRoommateWorker } from "../services/roommates/worker";

console.log("Roommate worker running: checking for new roommate posts every 60s. Ctrl+C to stop.");
startRoommateWorker();
