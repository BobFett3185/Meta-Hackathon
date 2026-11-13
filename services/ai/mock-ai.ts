import type { AIService, HousingExtraction, PostAnalysis, PostCategory, RawPostInput } from "./types";
import { validateAnalysis } from "./validate";

// Heuristic fallback so the app works with no API access. Same contract as MuseAI.
const money = (s: string) => {
  const m = s.match(/\$\s?(\d{1,2}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k)?/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return m[2] ? Math.round(n * 1000) : n;
};

function categorize(t: string): PostCategory {
  const s = t.toLowerCase();
  if (/(lease takeover|take ?over my lease|taking over|break(ing)? (my )?lease)/.test(s)) return "lease_takeover";
  if (/(free|giving away|curb)/.test(s) && /(couch|desk|chair|bed|table|lamp|shelf|dresser|mattress|stuff|items?)/.test(s) && !/\$\d/.test(s)) return "free_item";
  if (/(selling|for sale|obo|moving sale)/.test(s) || (/(couch|desk|mattress|dresser|bed frame|chair|monitor)/.test(s) && /\$\d/.test(s))) return "furniture_sale";
  if (/(looking for (a )?(roommate|roomie)|need (a )?(roommate|roomie)|roommate wanted|looking for (a )?room\b)/.test(s)) return "roommate_request";
  if (/(sublet|sublease|room (available|for rent)|\bbr\b|\bbd\b|bedroom|studio|apartment|apt\b|per month|\/mo)/.test(s)) return "housing_listing";
  if (/(hike|coffee|meetup|let'?s (go|grab)|who'?s (down|in)|join us)/.test(s)) return "activity_invite";
  if (/(festival|market|concert|this (sat|sun|fri)|event)/.test(s)) return "event";
  if (/(new to seattle|looking for friends|make friends)/.test(s)) return "friend_request";
  if (/(intern(ing)? at|incoming intern|just accepted|starting (in|on) june)/.test(s)) return "intro";
  return "discussion";
}

function extractHousing(t: string): HousingExtraction {
  const s = t.toLowerCase();
  const beds = s.match(/(\d)\s?(?:br|bd|bed)/) ?? (s.includes("studio") ? null : null);
  const baths = s.match(/(\d(?:\.5)?)\s?(?:ba|bath)/);
  const known = ["south lake union", "slu", "capitol hill", "fremont", "ballard", "u district", "university district", "queen anne", "belltown", "wallingford", "downtown", "bellevue", "green lake"];
  const loc = known.find((k) => s.includes(k));
  const amenityMap: Record<string, RegExp> = {
    "in-unit laundry": /(w\/d|washer|in-?unit laundry)/, parking: /parking/, gym: /\bgym\b/, "pets allowed": /(pet friendly|pets? (ok|allowed)|dog friendly|cat friendly)/,
    furnished: /(?<!un)furnished/, "a/c": /(a\/c|\bac\b|air conditioning)/, dishwasher: /dishwasher/, "rooftop": /rooftop/,
  };
  const dur = s.match(/(\d+)\s?(?:-|to)?\s?(?:\d+)?\s?(months?|mo\b|weeks?)/);
  const mi = s.match(/(?:june|jun)\s(\d{1,2})/);
  return {
    title: null, city: /vancouver|burnaby|\bubc\b/.test(s) ? "Vancouver" : /seattle|\bslu\b|capitol hill/.test(s) ? "Seattle" : null, latitude: null, longitude: null, rent: money(t), rent_basis: /(each|per person|\/person)/.test(s) ? "person" : null, location: loc === "slu" ? "South Lake Union" : loc ? loc.replace(/\b\w/g, (c) => c.toUpperCase()) : null,
    address: null,
    listing_type: s.includes("studio") ? "studio" : /sublet|sublease/.test(s) ? "sublet" : /private room|own room|room (for rent|available)/.test(s) ? "private_room" : beds ? "apartment" : null,
    available_to: null,
    availability: /(available now|asap|immediately)/.test(s) ? "available now" : null,
    move_in_date: mi ? `${new Date().getFullYear() + (new Date() > new Date(`${new Date().getFullYear()}-06-${mi[1]}`) ? 1 : 0)}-06-${mi[1].padStart(2, "0")}` : null,
    lease_duration: dur ? `${dur[1]} ${/w/.test(dur[2]) ? "weeks" : "months"}` : null,
    bedrooms: beds ? Number(beds[1]) : s.includes("studio") ? 0 : null, bathrooms: baths ? Number(baths[1]) : null,
    amenities: Object.entries(amenityMap).filter(([, re]) => re.test(s)).map(([k]) => k),
    utilities: /utilities included|utils? incl|all utilities/.test(s) ? "included" : /\+ ?util|utilities extra/.test(s) ? "not included" : null,
    living_preferences: [/quiet/.test(s) && "quiet", /(no smok|non-?smok)/.test(s) && "non-smoker", /(clean|neat)/.test(s) && "clean"].filter((x): x is string => !!x),
    contact: t.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? (/\bdm\b/i.test(t) ? "DM" : null),
    missing_fields: [],
  };
}

export class MockAI implements AIService {
  readonly provider = "mock" as const;
  async analyzePost(post: RawPostInput): Promise<PostAnalysis> {
    const category = categorize(post.content);
    const isHousing = ["housing_listing", "lease_takeover", "roommate_request"].includes(category);
    const isItem = ["furniture_sale", "free_item"].includes(category);
    return validateAnalysis({
      category,
      confidence: 0.6,
      summary: post.content.slice(0, 120),
      housing: isHousing ? extractHousing(post.content) : null,
      item: isItem
        ? { title: post.content.split(/[.\n!]/)[0].slice(0, 80), category: "furniture", price: category === "free_item" ? 0 : money(post.content), location: null, condition: null }
        : null,
    });
  }
}
