// Demo: post into a group and watch Nest turn it into a listing.
//   npm run demo:post -- "Furnished room in SLU, June 1-Aug 31, $1400/mo, util incl" "Seattle Intern"
import { createPost } from "../server/posts";
const [content, group] = process.argv.slice(2);
if (!content) { console.error('usage: npm run demo:post -- "post text" ["group name"]'); process.exit(1); }
const r = await createPost({ content, group });
console.log(JSON.stringify({ ...r, listing: r.listing && { neighborhood: r.listing.neighborhood, rent: r.listing.monthlyRent, basis: r.listing.rentBasis, from: r.listing.availableFrom, to: r.listing.availableTo, furnished: r.listing.furnished } }, null, 1));
