// Fictional, deterministic source data. Labels are evaluation truth, not AI output.
const { createHash } = require("node:crypto");
const VERSION = "nest-expansion-v1";
function id(kind, index) {
  const hex = createHash("sha256")
    .update(`${VERSION}:${kind}:${index}`)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
const first = [
  "Alex",
  "Jordan",
  "Maya",
  "Leo",
  "Sam",
  "Nora",
  "Evan",
  "Riley",
  "Zoe",
  "Noah",
  "Amara",
  "Theo",
  "Iris",
  "Owen",
  "Luca",
  "Aria",
  "Kai",
  "Sofia",
  "Eli",
  "Avery",
];
const last = ["Chen", "Rivera", "Patel", "Brooks", "Kim", "Bennett"];
const areas = [
  "South Lake Union",
  "Capitol Hill",
  "Fremont",
  "Ballard",
  "Queen Anne",
  "University District",
  "Belltown",
  "Beacon Hill",
  "Bellevue",
  "Redmond",
  "Kitsilano",
  "Point Grey",
];
const colleges = [
  "UBC",
  "University of Washington",
  "SFU",
  "University of Waterloo",
  "University of Toronto",
  "Seattle University",
];
const employers = [
  "Amazon",
  "Microsoft",
  "a local design studio",
  "a university research lab",
  "a nonprofit",
  "a summer co-op team",
];
const interests = [
  "hiking and board games",
  "tennis and weekend coffee",
  "photography and markets",
  "running and cooking",
  "books and museums",
  "cycling and live music",
];
const housingGroups = [
  "Seattle Intern Housing Summer 2027",
  "Seattle Housing, Sublets & Roommates",
  "Seattle Apartments and Housing",
];
const rooms = [
  "photo-1505693416388-ac5ce068fe85",
  "photo-1616594039964-ae9021a400a0",
  "photo-1615874959474-d609969a20ed",
  "photo-1540518614846-7eded433c457",
];
const photo = (p) =>
  `https://images.unsplash.com/${p}?auto=format&fit=crop&w=900&q=80`;
const items = [
  ["Queen bed frame", "Furniture", 80, "photo-1505693416388-ac5ce068fe85"],
  ["Two-seat sofa", "Furniture", 125, "photo-1555041469-a586c61ea9bc"],
  ["Desk and task chair", "Furniture", 65, "photo-1497215728101-856f4ea42174"],
  ["Floor lamp", "Home", 20, "photo-1513506003901-1e6a229e2d15"],
  ["Kitchen starter kit", "Household", 35, "photo-1556911220-bff31c812dba"],
  ["Bookshelf", "Furniture", 45, "photo-1594620302200-9a762244a156"],
  ["Dining table", "Furniture", 90, "photo-1449247709967-d4461a6a6103"],
  ["Moving boxes", "Household", 0, null],
  ["Coffee maker", "Home", 30, "photo-1495474472287-4d71bcdd2085"],
  ["Bicycle", "Sports", 140, "photo-1485965120184-e220f721d03e"],
];
const datePairs = [
  ["2027-06-01", "2027-08-31"],
  ["2027-06-15", "2027-09-15"],
  ["2027-07-01", "2027-08-31"],
  ["2027-08-01", "2028-07-31"],
  ["2027-09-01", "2028-08-31"],
  ["2027-05-15", "2027-08-15"],
];
const day = (s) =>
  new Date(`${s}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
function buildCorpus(groups, demoUserId) {
  const rows = {
    fb_users: [],
    fb_group_members: [],
    fb_posts: [],
    fb_post_images: [],
    fb_comments: [],
    fb_reactions: [],
    fb_marketplace_listings: [],
    fb_marketplace_images: [],
  };
  const truth = {
    version: VERSION,
    description:
      "Fictional data, source-grounded extraction labels kept separate from the application database.",
    people: [],
    sources: [],
  };
  const groupId = (name) => {
    const found = groups.find((g) => g.name === name);
    if (!found) throw new Error(`Required existing group missing: ${name}`);
    return found.id;
  };
  const timestamp = (n) =>
    new Date(Date.UTC(2026, 10, 12, 19, 0) - n * 17 * 60000).toISOString();
  const memberKeys = new Set();
  function join(group, user) {
    const group_id = groupId(group);
    const key = `${group_id}:${user}`;
    if (!memberKeys.has(key)) {
      rows.fb_group_members.push({
        group_id,
        user_id: user,
        role: "member",
        pinned: false,
        joined_at: "2026-11-01T12:00:00Z",
      });
      memberKeys.add(key);
    }
  }
  let sequence = 0;
  function post(
    key,
    author,
    group,
    title,
    body,
    category,
    expected,
    images = [],
  ) {
    const postId = id("post", key);
    rows.fb_posts.push({
      id: postId,
      author_id: author,
      group_id: groupId(group),
      title,
      body,
      share_count: 0,
      created_at: timestamp(sequence++),
    });
    join(group, author);
    images.forEach((url, position) =>
      rows.fb_post_images.push({
        id: id("post-image", `${key}:${position}`),
        post_id: postId,
        url,
        position,
      }),
    );
    truth.sources.push({
      table: "fb_posts",
      id: postId,
      category,
      group,
      expected,
    });
    return postId;
  }
  for (let i = 0; i < 120; i++) {
    const name = `${first[i % 20]} ${last[Math.floor(i / 20)]}`;
    const area = areas[i % areas.length];
    rows.fb_users.push({
      id: id("person", i),
      name,
      avatar_url: `https://i.pravatar.cc/150?img=${1 + (i % 70)}`,
      cover_url: null,
      location: i % 12 >= 10 ? "Vancouver, BC" : `${area}, Washington`,
      birthday: null,
      created_at: timestamp(400 + i),
    });
    truth.people.push({
      id: id("person", i),
      name,
      university: colleges[i % 6],
      company: employers[Math.floor(i / 6) % 6],
      interests: interests[i % 6],
      seekingRoommates: i < 72,
      openToMeeting: i >= 72,
      fictional: true,
    });
  }
  const units = [];
  for (let i = 0; i < 120; i++) {
    const demo = i < 12;
    const area = demo ? "South Lake Union" : areas[i % 12];
    const canadian = area === "Kitsilano" || area === "Point Grey";
    const type = demo
      ? "room"
      : ["room", "entire-home", "studio", "lease-takeover", "room"][i % 5];
    const entire = type !== "room";
    const bedrooms = type === "studio" ? 0 : entire ? 2 + (i % 2) : 2;
    const amount = demo
      ? 1200 + i * 25
      : entire
        ? 2100 + ((i * 137) % 2100)
        : 800 + ((i * 73) % 1200);
    const dates = demo ? datePairs[0] : datePairs[i % 6];
    const furnished = demo || i % 3 !== 0;
    const missingPrice = !demo && i % 13 === 0;
    const ambiguousBasis = !demo && i % 17 === 0;
    const unavailable = !demo && i % 11 === 0;
    const basis = ambiguousBasis ? null : entire ? "home" : "person";
    const utilities = i % 4 === 0 ? "included" : i % 4 === 1 ? "extra" : null;
    const pets = i % 3 === 0 ? "cats allowed" : i % 3 === 1 ? "no pets" : null;
    const unit = {
      canonicalId: `unit-${i}`,
      area,
      city: canadian
        ? "Vancouver"
        : ["Bellevue", "Redmond"].includes(area)
          ? area
          : "Seattle",
      currency: canadian ? "CAD" : "USD",
      listingType: type,
      monthlyRent: missingPrice ? null : amount,
      budgetBasis: basis,
      bedrooms,
      availableFrom: dates[0],
      availableTo: dates[1],
      furnished,
      utilities,
      pets,
      status: unavailable ? "unavailable" : "available",
      rentUpdatedInComments: !demo && i % 19 === 0,
    };
    const group = canadian
      ? "UBC, Housing, Room Rentals, Sublet Roommate"
      : housingGroups[i % 3];
    const author = id("person", i);
    const priceText = missingPrice
      ? "DM for rent details"
      : ambiguousBasis
        ? `${amount}/mo (ask me about the split)`
        : `${canadian ? "CAD" : "USD"} $${amount}/month ${entire ? "for the whole place" : "per person"}`;
    const opening = [
      `hey! ${type === "room" ? "private room" : type === "studio" ? "studio" : `${bedrooms}br apartment`} in ${area}`,
      `Summer ${type === "lease-takeover" ? "lease takeover" : "sublet"} — ${area}`,
      `Moving out, ${area} place available`,
    ][i % 3];
    const body = `${opening}. ${priceText}. ${day(dates[0])} through ${day(dates[1])}. ${furnished ? "Furnished: bed, desk and basic kitchen setup." : "Unfurnished; bring your own bed."} ${utilities === "included" ? "Utilities + wifi included." : utilities === "extra" ? "Utilities extra, estimate $75/mo." : "Utility costs not listed yet."} ${pets ? `${pets}.` : ""} ${i % 2 === 0 ? "In-unit laundry." : "Shared laundry in building."} ${entire && i % 4 === 1 && !ambiguousBasis && !missingPrice ? `If ${bedrooms} people share equally, that would be about $${Math.round(amount / bedrooms)} each; the lease rent is still $${amount} total.` : ""} ${unavailable ? "UPDATE: already taken, leaving this up for reference." : "Message me for a tour; exact address shared privately."}`;
    const images =
      i % 7 === 0
        ? []
        : [
            photo(rooms[i % 4]),
            ...(i % 3 === 0 ? [photo(rooms[(i + 1) % 4])] : []),
          ];
    const postId = post(
      `housing-${i}`,
      author,
      group,
      i % 4 === 0
        ? null
        : `${area} ${type.replaceAll("-", " ")} · ${missingPrice ? "rent on request" : `$${amount}/mo`}`,
      body,
      "housing",
      unit,
      images,
    );
    unit.sourcePostId = postId;
    units.push({
      unit,
      author,
      body,
      images,
      title: `${area} ${type.replaceAll("-", " ")}`,
      group,
    });
    if (i % 19 === 0 && !demo)
      rows.fb_comments.push({
        id: id("comment", `rent-${i}`),
        post_id: postId,
        author_id: author,
        parent_id: null,
        body: `Rent correction: $${amount - 100} per month ${entire ? "for the whole apartment" : "per person"}, not $${amount}. Dates unchanged.`,
        created_at: "2026-11-12T19:30:00Z",
      });
    else if (i % 6 === 0)
      rows.fb_comments.push({
        id: id("comment", `question-${i}`),
        post_id: postId,
        author_id: id("person", (i + 31) % 120),
        parent_id: null,
        body: "Is there a deposit? Is the move-in date flexible by a week?",
        created_at: "2026-11-12T19:20:00Z",
      });
    if (i % 19 === 0 && !demo)
      unit.commentCorrection = {
        monthlyRent: amount - 100,
        budgetBasis: entire ? "home" : "person",
      };
  }
  // Identical and abbreviated cross-posts let an AI test deduplication without deleting raw sources.
  for (let i = 0; i < 12; i++) {
    const u = units[i];
    post(
      `crosspost-${i}`,
      u.author,
      housingGroups[(i + 1) % 3],
      u.title,
      i % 2 === 0
        ? u.body
        : `cross posting: ${u.unit.area} furnished room, $${u.unit.monthlyRent} per person per month, June 1–August 31 2027. Same room as my other post; please don't message twice.`,
      "housing",
      { ...u.unit, duplicateOf: u.unit.sourcePostId },
      i % 2 === 0 ? u.images : [],
    );
  }
  for (let i = 0; i < 72; i++) {
    const p = truth.people[i];
    const area = areas[i % 10];
    const dates = datePairs[i % 6];
    const budget = 950 + ((i * 75) % 1100);
    const quiet = i % 3 !== 0;
    const existing = i % 4 === 0;
    const preferences = {
      quietHome: quiet,
      cleanliness: [
        "tidy daily",
        "weekly shared cleaning",
        "relaxed but clean common areas",
      ][i % 3],
      sleep: ["early riser", "night owl", "variable shift schedule"][i % 3],
      pets:
        i % 5 === 0
          ? "one cat"
          : i % 5 === 1
            ? "no pets preferred"
            : "open to pets",
    };
    const text = `Hi, I'm ${p.name}, from ${p.university}, heading to ${p.company} for summer 2027. ${existing ? `I already have a place in ${area} and explicitly want someone to fill the spare room.` : `I'm looking for ${(i % 2) + 1} roommate${i % 2 ? "s" : ""} to find a place together near ${area}.`} Budget $${budget} per person each month, ${day(dates[0])}–${day(dates[1])}. I prefer ${quiet ? "a quiet home" : "a social home with occasional guests"}, ${preferences.cleanliness}; ${preferences.sleep}. ${preferences.pets}. I'm into ${p.interests}. Happy to receive roommate connection requests. Please ask about anything I haven't mentioned.`;
    post(
      `roommate-${i}`,
      p.id,
      i % 2 ? "Seattle Intern Housing Summer 2027" : "Amazon Interns 2027",
      `${existing ? "Room to fill" : "Looking for roommates"} · ${p.name}`,
      text,
      "roommate",
      {
        personId: p.id,
        area,
        budgetPerPerson: budget,
        dates,
        alreadyHasHome: existing,
        roommateCount: (i % 2) + 1,
        preferences,
        seekingRoommates: true,
      },
    );
  }
  for (let i = 0; i < 48; i++) {
    const p = truth.people[72 + i];
    const area = areas[i % 10];
    const invitation = i % 2 === 0;
    const activity = [
      "coffee",
      "an easy park walk",
      "board games",
      "a farmers market visit",
      "beginner tennis",
      "a neighborhood photo walk",
    ][i % 6];
    post(
      `community-${i}`,
      p.id,
      "Young Professionals in Seattle",
      invitation ? `${activity} · ${area}` : `New in ${area}`,
      invitation
        ? `I'm ${p.name}, new to ${area}. Anyone interested in ${activity} on Saturday June ${5 + (i % 4) * 7}, 2027 at ${i % 2 ? "2 PM" : "10 AM"}? I'm into ${p.interests}. I explicitly welcome meetup requests. No attendance list yet — reply if you want to join. Public meeting place to be agreed in the group.`
        : `Hi from ${p.name}! I'm a ${p.university} student joining ${p.company}. Moving to ${area} in June 2027 and open to meeting people for ${p.interests}. You can send me a connection request. Not looking for housing through this post.`,
      invitation ? "activity" : "introduction",
      {
        personId: p.id,
        area,
        interests: p.interests,
        openToMeeting: true,
        attendanceCount: null,
      },
    );
  }
  for (let i = 0; i < 180; i++) {
    const housing = i < 90;
    const u = housing ? units[i] : null;
    const item = items[(i - 90 + 100) % 10];
    const area = housing ? u.unit.area : areas[i % 12];
    const canadian = ["Kitsilano", "Point Grey"].includes(area);
    const status = housing
      ? u.unit.status === "unavailable"
        ? "sold"
        : i % 9 === 0
          ? "pending"
          : "available"
      : i % 11 === 0
        ? "sold"
        : i % 7 === 0
          ? "pending"
          : "available";
    const price = housing
      ? u.unit.monthlyRent
      : item[2] === 0 || i % 9 === 0
        ? 0
        : item[2] + (i % 4) * 10;
    const listingId = id("market", i);
    const seller = housing ? u.author : id("person", i % 120);
    const description = housing
      ? `${u.body} Cross-posted from my housing group; this is the same unit, not another room.`
      : `${item[0]} for ${price === 0 ? "free" : `${canadian ? "CAD" : "USD"} $${price}`}. ${["Good used condition, some cosmetic wear.", "Used for one summer; measurements available on request.", "Moving sale, must collect by November 30."][i % 3]} Pickup in ${area}; ${i % 2 ? "no delivery, bring help for heavy items." : "can drop off within the neighborhood for $10 extra."} ${status === "sold" ? "Already collected — sold." : status === "pending" ? "Pickup arranged; currently pending." : "Still available."}`;
    rows.fb_marketplace_listings.push({
      id: listingId,
      seller_id: seller,
      title: housing ? u.title : item[0],
      description,
      price,
      currency: canadian ? "CAD" : "USD",
      location: `${area}, ${canadian ? "Vancouver, BC" : "Seattle area, WA"}`,
      category: housing ? "Housing" : item[1],
      status,
      created_at: timestamp(i + 40),
    });
    const images = housing ? u.images : item[3] ? [photo(item[3])] : [];
    images.forEach((url, position) =>
      rows.fb_marketplace_images.push({
        id: id("market-image", `${i}:${position}`),
        listing_id: listingId,
        url,
        position,
      }),
    );
    truth.sources.push({
      table: "fb_marketplace_listings",
      id: listingId,
      category: housing ? "housing" : "item",
      expected: housing
        ? { ...u.unit, duplicateOf: u.unit.sourcePostId, status }
        : {
            title: item[0],
            price,
            currency: canadian ? "CAD" : "USD",
            area,
            status,
            delivery: i % 2 ? "pickup-only" : "local delivery $10",
          },
    });
    if (!housing && i < 130)
      post(
        `item-${i}`,
        seller,
        canadian ? "Vancouver Marketplace" : "Seattle Furniture Marketplace",
        item[0],
        description,
        "item",
        { marketplaceListingId: listingId, price, area, status },
        images,
      );
  }
  for (let i = 0; i < 20; i++)
    post(
      `discussion-${i}`,
      id("person", i + 40),
      "Seattle Intern Housing Summer 2027",
      null,
      [
        "Does anyone know how the bus pass works for interns? Not a housing offer.",
        "What should I pack for a Seattle summer? No listing here, just advice please.",
        "Is it worth renting furniture for a 12-week internship? Looking for experiences, not selling anything.",
        "Anyone have tips for touring a room remotely? Please share general advice.",
      ][i % 4],
      "discussion",
      { isListing: false },
    );
  // Engagement is backed by actual rows; no fabricated attendee or reaction counters.
  rows.fb_posts.forEach((p, i) => {
    for (let j = 0; j < i % 4; j++)
      rows.fb_reactions.push({
        post_id: p.id,
        user_id: id("person", (i + j + 21) % 120),
        type: j % 2 ? "love" : "like",
        created_at: "2026-11-12T19:40:00Z",
      });
  });
  if (demoUserId)
    for (const name of [
      ...housingGroups,
      "Amazon Interns 2027",
      "Seattle Furniture Marketplace",
      "Young Professionals in Seattle",
      "UBC, Housing, Room Rentals, Sublet Roommate",
      "Vancouver Marketplace",
    ])
      join(name, demoUserId);
  return { rows, truth };
}
module.exports = { buildCorpus, id, VERSION };
