import { ingestPosts } from "../services/ingestion/ingest";
const posts = [
  { id: "p1", content: "Sublet avail June 1-Aug 30!! 1br in SLU, $2.1k/mo util incl, W/D in unit + gym. DM me." },
  { id: "p2", content: "SUBLET: 1br South Lake Union, June 1 - Aug 30, $2100/mo utilities included, washer/dryer in unit, gym. message me" },
  { id: "p3", content: "Room for rent in Fremont, pets ok. pm for details" },
  { id: "p4", content: "giving away a free couch, must pickup in Ballard" },
  { id: "p5", content: "anyone want to grab coffee this week? new intern at amazon" },
];
const r = await ingestPosts(posts);
for (const x of r.posts) console.log(x.rawPostId, x.provider, x.category, "dup:", x.duplicateOf, "review:", x.needsReview, "rent:", x.housing?.rent, "loc:", x.housing?.location);
console.log("listings:", r.listings.map((l) => l.rawPostId), "items:", r.items.map((l) => l.rawPostId), "failed:", r.failed);
