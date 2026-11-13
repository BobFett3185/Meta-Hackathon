import { analyzePost } from "../services/ai/index";
const posts = [
  "Sublet avail June 1-Aug 30!! 1br in SLU, $2.1k/mo util incl, W/D in unit + gym. DM me. pics below",
  "selling my ikea desk + chair $60 obo, pickup capitol hill",
  "anyone down to hike rattlesnake ledge this sat? new to seattle lol",
];
for (const [i, content] of posts.entries()) {
  const r = await analyzePost({ id: String(i), content });
  console.log(r.provider, JSON.stringify(r));
}
