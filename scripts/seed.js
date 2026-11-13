// Seeds the mock Facebook tables. Run: npm run seed
// Wipes all fb_* data first, so it is safe to re-run.
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const db = createClient(url, key, {
  auth: { persistSession: false },
  realtime: { transport: require('ws') }, // Node < 22 has no native WebSocket
});

// ---------------------------------------------------------------- helpers
const id = () => randomUUID();
const ago = (hours) => new Date(Date.now() - hours * 3600 * 1000).toISOString();
const av = (n) => `https://i.pravatar.cc/150?img=${n}`;
const ux = (photo, w = 800) => `https://images.unsplash.com/${photo}?w=${w}`;

const IMG = {
  apt1: 'https://media.equityapartments.com/images/c_crop%2Cx_0%2Cy_0%2Cw_1920%2Ch_1080/c_fill%2Cw_1920%2Ch_1080/q_80/4216-137/helios-apartments-living-room.jpg',
  apt2: 'https://ssl.cdn-redfin.com/photo/rent/e2bd720e-c007-412d-be53-b63520ecabcf/islphoto/genIsl.1_2.jpg',
  apt3: 'https://ovationseattle.com/assets/images/cache/Ovation-45-0311420ef38a750898213da0f544a477.jpg',
  shelf: ux('photo-1555041469-a586c61ea9bc'),
  bundle: ux('photo-1523381210434-271e8be1f52b'),
  paddle: ux('photo-1615065820499-57d11d2b607c'),
  bed: ux('photo-1505693416388-ac5ce068fe85'),
  lamp: ux('photo-1513506003901-1e6a229e2d15'),
  reel: ux('photo-1519608487953-e999c86e7455', 1000),
  story: ux('photo-1535713875002-d1d0cf377fde', 500),
};

async function insert(table, rows) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from(table).insert(rows.slice(i, i + 200));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`  ${table}: ${rows.length}`);
}

async function wipe() {
  // Children first; cascades handle the rest, but be explicit.
  const tables = [
    'nest_preferences',
    'fb_notifications', 'fb_marketplace_messages', 'fb_marketplace_threads',
    'fb_marketplace_images', 'fb_marketplace_listings', 'fb_reels', 'fb_stories',
    'fb_reactions', 'fb_comments', 'fb_post_images', 'fb_posts',
    'fb_group_members', 'fb_groups', 'fb_friendships', 'fb_users',
  ];
  for (const t of tables) {
    // every table has a non-null column we can filter on to satisfy "delete needs a filter"
    const col = ['fb_friendships', 'fb_group_members', 'fb_reactions'].includes(t)
      ? (t === 'fb_friendships' ? 'user_id' : t === 'fb_group_members' ? 'group_id' : 'post_id')
      : 'id';
    const { error } = await db.from(t).delete().not(col, 'is', null);
    if (error) throw new Error(`wipe ${t}: ${error.message}`);
  }
}

// ---------------------------------------------------------------- users
const U = {};
const userDefs = [
  ['dhweya', 'Dhweya Modi', 12, 'Seattle, Washington', '2006-03-03', IMG.apt3],
  ['divyaK', 'Divya Khurana', 47, 'Vancouver, BC'],
  ['arr', 'A. R. Rahman', 32, 'Seattle, Washington'],
  ['viren', 'Viren Shah', 5, 'Seattle, Washington'],
  ['harriet', 'Harriet Packpackpack', 47, 'Seattle, Washington'],
  ['maitray', 'Maitray Modi', 49, 'Vancouver, BC'],
  ['dipali', 'Dipali Modi', 16, 'Burnaby, BC'],
  ['hiral', 'Hiral Modi', 32, 'Surrey, BC'],
  ['divyaS', 'Divya Singh', 5, 'Seattle, Washington'],
  ['bethany', 'Bethany Kankelborg', 49, 'Seattle, Washington'],
  ['dhruvil', 'Dhruvil Modi', 12, 'Vancouver, BC'],
  ['jdan', 'Jdan Lee', 33, 'Seattle, Washington'],
  ['nathan', 'Nathan Brooks', 15, 'Seattle, Washington'],
  ['rongru', 'Rongru Chen', 25, 'Seattle, Washington'],
  ['kerry', 'Kerry Okafor', 44, 'Seattle, Washington'],
  ['sa', 'Sa Patel', 53, 'Bellevue, Washington'],
  ['corteezyy', 'Corteezyy', 60, 'Seattle, Washington'],
  ['priya', 'Priya Nair', 9, 'Vancouver, BC'],
  ['marcus', 'Marcus Webb', 52, 'Seattle, Washington'],
  ['lena', 'Lena Park', 20, 'Seattle, Washington'],
  ['tom', 'Tom Alvarez', 59, 'Vancouver, BC'],
  ['aisha', 'Aisha Rahman', 23, 'Seattle, Washington'],
];
const users = userDefs.map(([k, name, img, location, birthday, cover]) => {
  U[k] = id();
  return { id: U[k], name, avatar_url: av(img), cover_url: cover || null, location, birthday: birthday || null };
});

const demoGoal = {
  id: 'summer-2027',
  rawPrompt: 'I’m moving to Seattle June–August 2027. Find a furnished room under $1,500 per person and someone to share with.',
  intent: 'Both',
  city: 'Seattle',
  preferredNeighborhoods: ['South Lake Union'],
  startDate: '2027-06-01',
  endDate: '2027-08-31',
  budgetAmount: 1500,
  budgetBasis: 'person',
  housingType: 'room',
  furnishedRequirement: true,
  roommateCount: 1,
  alreadyHasHome: false,
  mustHaves: ['Location', 'Dates', 'Budget', 'Furnished'],
  preferences: ['Quiet home', 'Near Amazon'],
  sourceIds: ['marketplace', 'interns', 'ubc'],
  maxResults: 5,
  cadence: 'Daily',
  notificationsEnabled: false,
  updatedAt: new Date().toISOString(),
};

const nestPreferences = [{
  user_id: U.dhweya,
  raw_prompt: demoGoal.rawPrompt,
  intent: demoGoal.intent,
  city: demoGoal.city,
  preferred_neighborhoods: demoGoal.preferredNeighborhoods,
  start_date: demoGoal.startDate,
  end_date: demoGoal.endDate,
  budget_amount: demoGoal.budgetAmount,
  budget_basis: demoGoal.budgetBasis,
  housing_type: demoGoal.housingType,
  furnished_requirement: demoGoal.furnishedRequirement,
  roommate_count: demoGoal.roommateCount,
  already_has_home: demoGoal.alreadyHasHome,
  must_haves: demoGoal.mustHaves,
  preferences: demoGoal.preferences,
  source_ids: demoGoal.sourceIds,
  max_results: demoGoal.maxResults,
  cadence: demoGoal.cadence,
  notifications_enabled: demoGoal.notificationsEnabled,
  goal_json: demoGoal,
}];

const friendships = [];
const addFriends = (a, list) => list.forEach((b) => {
  friendships.push({ user_id: U[a], friend_id: U[b] }, { user_id: U[b], friend_id: U[a] });
});
// friends of friends, so mutual-friend counts are real
addFriends('maitray', ['dipali', 'hiral', 'dhruvil', 'divyaK']);
addFriends('dipali', ['hiral', 'divyaS', 'bethany']);
addFriends('divyaS', ['arr', 'viren', 'lena']);
addFriends('arr', ['viren', 'marcus', 'aisha']);
addFriends('bethany', ['lena', 'aisha']);
addFriends('dhweya', ['maitray', 'dipali', 'hiral', 'divyaS', 'divyaK', 'arr', 'viren', 'dhruvil', 'bethany', 'priya', 'lena', 'marcus', 'aisha', 'tom', 'harriet', 'jdan', 'nathan']);

// ---------------------------------------------------------------- groups
const G = {};
const groupDefs = [
  // [key, name, privacy, memberCount-ish description, image]
  ['vanHousing', 'Vancouver housing Rentals', 'public', IMG.apt1],
  ['vanRoommates', 'Vancouver Rentals & Roommates', 'public', IMG.shelf],
  ['vanRents', 'Vancouver Rents & Roommates', 'public', IMG.bundle],
  ['vanAll', 'Vancouver Rentals & Roommates 🔥 including all of the lower mainland', 'public', IMG.paddle],
  ['vanMarket', 'Vancouver Marketplace', 'public', IMG.bed],
  ['vanLooking', 'Vancouver, BC Looking Housing, Apartment Room Rentals', 'public', IMG.lamp],
  ['ubcHousing', 'UBC, Housing, Room Rentals, Sublet Roommate', 'private', IMG.apt2],
  ['ubcRoommates', 'UBC students looking for roommates, housing rental/sublet', 'private', IMG.apt3],
  ['ubcRoommates2', 'UBC Roommates and Housing', 'private', IMG.apt1],
  ['ubcOffCampus', 'UBC - Off campus housing', 'private', IMG.shelf],
  ['seaApts', 'Seattle Apartments and Housing', 'public', IMG.apt2],
  ['seaSublets', 'Seattle Housing, Sublets & Roommates', 'public', IMG.apt1],
  ['seaIntern', 'Seattle Intern Housing Summer 2027', 'private', IMG.apt3],
  ['seaFurniture', 'Seattle Furniture Marketplace', 'public', IMG.bed],
  ['seaYoung', 'Young Professionals in Seattle', 'public', IMG.reel],
  ['amazonInterns', 'Amazon Interns 2027', 'private', IMG.story],
  // Discover suggestions (user is not a member)
  ['sugMarket', 'Marketplace ✅', 'public', IMG.apt1],
  ['sugCasting', 'Seattle and PNW Open Castings', 'public', IMG.shelf],
  ['sugMoms', 'moms in their 20’s', 'private', IMG.bundle],
  ['sugVinted', 'VINTED FINDS', 'public', IMG.paddle],
  ['sugJobs', 'Seattle Queer Jobs', 'private', IMG.bed],
  ['sugSocial', 'Seattle City Social', 'private', IMG.lamp],
];
const groups = groupDefs.map(([k, name, privacy, cover]) => {
  G[k] = id();
  return { id: G[k], name, privacy, cover_url: cover, description: null };
});

const memberOf = ['vanHousing', 'vanRoommates', 'vanRents', 'vanAll', 'vanMarket', 'vanLooking',
  'ubcHousing', 'ubcRoommates', 'ubcRoommates2', 'ubcOffCampus', 'seaApts', 'seaSublets',
  'seaIntern', 'seaFurniture', 'seaYoung', 'amazonInterns'];
const pinned = new Set(['seaApts', 'seaIntern', 'amazonInterns', 'ubcHousing']);
const groupMembers = [];
memberOf.forEach((g) => groupMembers.push({
  group_id: G[g], user_id: U.dhweya, role: 'member', pinned: pinned.has(g),
}));
// Other users spread across groups so authors/commenters are members.
const spread = {
  vanHousing: ['divyaK', 'maitray', 'priya', 'tom'],
  vanRoommates: ['divyaK', 'dipali', 'hiral', 'priya'],
  vanRents: ['maitray', 'dhruvil', 'tom'],
  vanAll: ['divyaK', 'priya', 'tom', 'dhruvil'],
  vanMarket: ['hiral', 'tom', 'dipali'],
  vanLooking: ['priya', 'maitray'],
  ubcHousing: ['divyaK', 'priya', 'maitray', 'dipali', 'tom'],
  ubcRoommates: ['priya', 'dhruvil', 'hiral'],
  ubcRoommates2: ['divyaK', 'tom'],
  ubcOffCampus: ['priya', 'maitray', 'hiral'],
  seaApts: ['harriet', 'divyaS', 'bethany', 'marcus', 'lena', 'aisha', 'viren'],
  seaSublets: ['harriet', 'marcus', 'lena', 'aisha', 'jdan', 'bethany'],
  seaIntern: ['arr', 'viren', 'divyaS', 'lena', 'aisha', 'marcus', 'bethany'],
  seaFurniture: ['jdan', 'nathan', 'rongru', 'kerry', 'sa', 'marcus', 'lena'],
  seaYoung: ['arr', 'viren', 'bethany', 'aisha', 'corteezyy', 'lena'],
  amazonInterns: ['arr', 'viren', 'divyaS', 'marcus', 'aisha', 'lena'],
  // Discover suggestions (Dhweya is not a member)
  sugMarket: ['jdan', 'kerry', 'nathan', 'rongru', 'sa', 'marcus'],
  sugCasting: ['corteezyy', 'aisha', 'lena'],
  sugMoms: ['bethany', 'kerry'],
  sugVinted: ['lena', 'aisha', 'rongru', 'bethany'],
  sugJobs: ['viren', 'marcus', 'arr'],
  sugSocial: ['aisha', 'lena', 'corteezyy', 'bethany', 'marcus', 'viren', 'arr'],
};
for (const [g, list] of Object.entries(spread)) {
  list.forEach((u) => groupMembers.push({ group_id: G[g], user_id: U[u], role: 'member', pinned: false }));
}
groupMembers.push({ group_id: G.seaApts, user_id: U.harriet, role: 'admin', pinned: false });
// de-dupe (harriet inserted twice above)
const seen = new Set();
const groupMembersUniq = groupMembers.filter((m) => {
  const k = m.group_id + m.user_id;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
}).map((m) => (m.user_id === U.harriet && m.group_id === G.seaApts ? { ...m, role: 'admin' } : m));

// ---------------------------------------------------------------- posts
// [group, author, hoursAgo, title, body, [images], shares]
const P = [];
const post = (group, author, hrs, title, body, images = [], shares = 0) => {
  const p = { id: id(), group_id: group ? G[group] : null, author_id: U[author], title, body, share_count: shares, created_at: ago(hrs), _images: images };
  P.push(p);
  return p;
};

// The featured post from the UI
const featured = post('seaApts', 'harriet', 72,
  '🏙️ 1-Bedroom Apartment Sublet in South Lake Union – December & January',
  'Hi everyone! I’m looking to sublet my beautiful 1-bedroom apartment in South Lake Union for December and January. $2,150/mo, utilities not included (~$90). Furnished, in-unit W/D, gym + rooftop. 5 min walk to the Amazon campus and the streetcar. Available Dec 1 – Jan 31, flexible by a few days. Pets are a no, sorry! DM me if interested and I can send more pics and set up a tour.',
  [IMG.apt2, IMG.apt1], 3);

// Seattle housing
post('seaApts', 'marcus', 5, null, 'sublet my room in cap hill june-aug. 950 all in, own bath. roommates are chill (2 guys, both work in tech). close to the light rail. dm', [IMG.apt3], 1);
post('seaApts', 'lena', 20, '2BR in Fremont - lease takeover', 'Taking over lease starting July 1. 2bd/1ba, $2,800/mo, 12 month lease left (ends June 30). Street parking only, cat ok w/ deposit. Near Gas Works park. Pls msg if serious', [IMG.apt1], 0);
post('seaApts', 'aisha', 30, null, 'Anyone know good neighborhoods for 22yo girl moving to Seattle for work in SLU? Budget around 1800 for a studio or 1bd. Dont want a crazy commute!!', [], 2);
post('seaApts', 'harriet', 74, 'Studio in Belltown $1,650', 'Studio, 450sqft, Belltown, avail now. Water/sewer included. No pets. 6 month min.', [IMG.apt2], 0);
post('seaApts', 'divyaS', 100, null, 'URGENT need roommate for 3br in Ballard starting asap!! rent is 1100 + utils. room is unfurnished. 2 other roomates (m/f) are grad students', [IMG.apt3], 4);
post('seaApts', 'marcus', 6, null, 'sublet my room in cap hill june-aug. 950 all in, own bath. dm', [], 0); // near-duplicate on purpose

post('seaSublets', 'jdan', 12, 'Summer sublet U-District', 'Room in a 4bd house, U-District, Jun 15 - Sep 10. $800/mo incl. utils + wifi. Female preferred but open to anyone respectful. Close to the 44 bus. Photos in comments soon', [IMG.apt1], 1);
post('seaSublets', 'bethany', 26, null, 'Looking for a roommate to share 2br in Queen Anne starting Aug 1. Im a nurse so I work nights sometimes, quiet hrs important. ~1500 each.', [], 1);
post('seaSublets', 'lena', 40, 'Room available - Capitol Hill, 8/1', 'Private room avail 8/1 in 3br apt. $1,200 + 1/3 utilities. Washer/dryer in unit, balcony. Looking for someone 21-28, no smokers.', [IMG.apt2, IMG.apt3], 2);
post('seaSublets', 'aisha', 52, null, 'does anyone have a couch or air mattress i can crash on the first week of june while i find a place?? will pay lol', [], 3);
post('seaSublets', 'marcus', 70, null, '1br in SLU avail July 1, 2400/mo, 12mo lease. sorry no pets', [IMG.apt1], 0);

post('seaIntern', 'arr', 8, 'Amazon intern looking for roommates — SLU area', 'Hey all! Starting my Amazon SDE internship June 8th. Looking for 1-2 other interns to split a 2bd near South Lake Union, budget ~$1,500/person. Furnished sublet is fine (Jun-Aug). Non-smoker, clean, early riser.', [], 6);
post('seaIntern', 'viren', 18, null, 'Anyone want to split a place in Belltown? 3 interns, 12 weeks, ~1400 each. We have a lead on a furnished 3br already just need one more!', [IMG.apt3], 2);
post('seaIntern', 'divyaS', 28, 'Intern housing — Capitol Hill 2BR Jun 1–Aug 31', 'My roommate backed out so I have a 2br in Cap Hill for the summer. $3,100 total ($1,550 each). Furnished. Walkable to light rail → 15 min to SLU. Interested interns pls DM.', [IMG.apt1], 3);
post('seaIntern', 'lena', 60, null, 'is it better to live in SLU or capitol hill for the summer?? i dont have a car', [], 5);
post('seaIntern', 'marcus', 90, null, 'UBC → Seattle interns!! who else is moving from Vancouver this june? need to figure out the border/visa stuff too lol', [], 7);

// Vancouver / UBC
post('ubcHousing', 'priya', 4, 'Room Swap Request UBC Year-Round', 'Hey! I’m looking to swap my Ponderosa unit for a Brock Tallwood/Exchange 4BR — message me if you’re interested!', [], 0);
post('ubcHousing', 'tom', 14, null, 'Sublet available May-Aug near UBC, 4 bdrm house, one room left $900. 10 min bike to campus. Female roommates only pls', [IMG.apt2], 2);
post('ubcHousing', 'divyaK', 33, null, 'looking for 1 roommate to share 2bd in Kitsilano starting sept. rent 1450 each. Im a 3rd year, no parties pls', [], 1);
post('ubcRoommates', 'dhruvil', 22, null, 'Anyone have a spare room for 4 months (jan-apr)? Co-op term, need something close to skytrain. budget ≤ 1000', [], 2);
post('ubcRoommates', 'priya', 48, 'Looking for 2 roommates — Fall 2026', 'Planning to rent a 3BR near campus for the next academic year. Looking for 2 girls who are neat, social-ish, and okay with a cat. Budget 900-1100 each.', [IMG.apt3], 4);
post('ubcOffCampus', 'maitray', 16, null, 'subletting my studio in Marpole, $1250, available immediately thru August. 15 min on the 41 to UBC', [IMG.apt1], 0);
post('ubcRoommates2', 'tom', 66, null, 'room for rent in Dunbar, quiet street, $1,100 incl internet. grad students pref. avail sept 1', [IMG.apt2], 1);
post('vanHousing', 'divyaK', 10, 'Basement suite Commercial Drive', '1bd basement suite, $1,650, avail June 1. Shared laundry. Pets considered. 1 yr lease.', [IMG.apt3], 0);
post('vanHousing', 'hiral', 44, null, 'Is anyone leaving a lease early? Need a 1bd in Burnaby near Metrotown, max 1800', [], 0);
post('vanRoommates', 'dipali', 20, null, 'ISO roommate! 2bd2ba Yaletown $2,400/mo, 10th floor, great views. Looking for someone working downtown', [IMG.apt1], 3);
post('vanRoommates', 'priya', 56, null, 'Roomie needed ASAP. 2 rooms open in a 5BR in East Van. $850 each. Dogs ok!', [], 1);
post('vanRents', 'maitray', 36, null, 'looking for a room around UBC/Point Grey for September. max $1000. 2nd yr eng student', [], 0);
post('vanAll', 'tom', 7, 'Lease takeover — Metrotown, Jul 1', 'Taking over lease? 1bdrm, Metrotown, $1,900, 9 months left. Gym + pool. Landlord is cool with the transfer.', [IMG.apt2], 2);
post('vanLooking', 'priya', 80, null, 'hii does anyone know a good area for international students thats safe and cheap?? coming in sept', [], 6);
post('vanMarket', 'hiral', 9, null, 'Selling my Ikea Kallax shelf 4x4, white. $40. Pickup Burnaby. Moving sale!', [IMG.shelf], 0);
post('vanMarket', 'tom', 38, null, 'FREE: boxes & packing paper, just moving out. Must pickup today in Kits', [], 1);

// Furniture / marketplace groups
post('seaFurniture', 'jdan', 3, 'Pickleball bundle + 2 balls', 'Selling a pack of 2 paddles and 2 balls, barely used. $20 firm. Pickup Ballard.', [IMG.paddle], 0);
post('seaFurniture', 'marcus', 11, null, 'moving sale!! queen mattress $120, desk $40, lamp $10. everything must go by sat', [IMG.bed, IMG.lamp], 1);
post('seaFurniture', 'kerry', 24, null, 'FREE couch (gray, 3 seater). you haul. Beacon Hill', [IMG.apt1], 0);
post('seaFurniture', 'lena', 46, 'Metal bed frame – $30', 'Twin/full metal bed frame, disassembles easily. Cap Hill pickup.', [IMG.bed], 0);
post('seaFurniture', 'rongru', 58, null, 'Anyone selling a cheap desk + chair? Interning in SLU for the summer, will pick up', [], 1);

// Social / young professionals / Amazon
post('seaYoung', 'aisha', 2, null, 'moving to seattle in june, any recs for things to do / making friends?? i dont know anyone here', [], 1);
post('seaYoung', 'corteezyy', 15, 'Sunset hike at Rattlesnake Ledge this Sat?', 'Putting together a small group for a sunset hike Saturday ~4pm. Moderate, ~4 miles. Comment if you’re in and I’ll make a group chat!', [IMG.reel], 2);
post('seaYoung', 'bethany', 34, null, 'new coffee spot in fremont is so good, anyone want to cowork there saturday morning?', [IMG.lamp], 0);
post('seaYoung', 'viren', 62, null, 'Pickleball anyone? Beginners welcome, Green Lake courts Sunday', [IMG.paddle], 0);
post('amazonInterns', 'arr', 6, null, 'Hi everyone! I’m an SDE intern, starting June 8th. Would love to meet other interns before we start, anyone down for coffee near SLU this week?', [], 3);
post('amazonInterns', 'marcus', 27, null, 'Intern meetup at Cascade Park this Friday after work! bring snacks', [IMG.reel], 4);
post('amazonInterns', 'divyaS', 50, null, 'does anyone know if the orientation is in person or hybrid? and do we get a badge on day 1?', [], 2);
post('seaIntern', 'aisha', 14, 'Furnished room near Amazon campus', 'Room open June 1 through August 31 in a quiet 2BR near SLU. $1,425 per person with utilities and Wi-Fi included. Looking for another intern who likes a tidy home.', [IMG.apt2], 2);
post('seaFurniture', 'nathan', 18, 'Free kitchen starter set', 'Moving out after my internship and giving away plates, pans, mugs, and a coffee maker. Pickup near South Lake Union this weekend.', [IMG.bundle], 1);
post('seaYoung', 'lena', 42, 'Weekend board game meetup', 'A few of us are meeting at a cafe in South Lake Union Saturday afternoon for board games. New to Seattle? Come say hi!', [], 3);

// Profile / home feed posts (no group)
post(null, 'dhweya', 120, null, 'Just booked my flight to Seattle ✈️ see you in June!', [IMG.apt3], 0);
post(null, 'dipali', 150, null, 'Weekend in Whistler 🏔️', [IMG.reel, IMG.story], 0);
post(null, 'bethany', 200, null, 'Added a few photos from the lake', [IMG.apt2], 0);

// ---------------------------------------------------------------- comments / reactions
const comments = [];
const reactions = [];
const REACTION_TYPES = ['like', 'like', 'like', 'love', 'haha', 'care', 'wow'];
const allUsers = Object.keys(U);

const commentPool = {
  housing: [
    ['Is this still available?', 'Yes still available!'],
    ['What’s the deposit?', 'One month’s rent, refundable.'],
    ['Is parking included?', null],
    ['Interested! Sent you a DM', null],
    ['Can I see it this weekend?', 'Sure, Saturday afternoon works.'],
    ['bump', null],
    ['Are pets allowed?', null],
  ],
  social: [
    ['I’m in!', null],
    ['Count me in 🙌', null],
    ['Where should we meet?', 'I’ll drop a pin in the group chat.'],
    ['This sounds fun, sending a request', null],
    ['Same, just moved here', null],
  ],
  market: [
    ['Still available?', 'Yes!'],
    ['Would you take $15?', null],
    ['Can pick up tonight', null],
    ['interested', null],
  ],
};

function seedEngagement(p, idx) {
  const kind = p.group_id === G.seaFurniture || p.group_id === G.vanMarket ? 'market'
    : (p.group_id === G.seaYoung || p.group_id === G.amazonInterns || !p.group_id) ? 'social' : 'housing';
  const pool = commentPool[kind];
  const nComments = p === featured ? 9 : (idx * 7) % 5; // deterministic, 0-4 (featured gets more)
  const nReact = p === featured ? 14 : 2 + ((idx * 5) % 9);
  const others = allUsers.filter((k) => U[k] !== p.author_id);

  for (let i = 0; i < nComments; i++) {
    const [q, reply] = pool[(idx + i) % pool.length];
    const commenter = others[(idx * 3 + i * 5) % others.length];
    const cid = id();
    const t = new Date(new Date(p.created_at).getTime() + (i + 1) * 40 * 60000).toISOString();
    comments.push({ id: cid, post_id: p.id, author_id: U[commenter], parent_id: null, body: q, created_at: t });
    if (reply) {
      comments.push({ id: id(), post_id: p.id, author_id: p.author_id, parent_id: cid, body: reply,
        created_at: new Date(new Date(t).getTime() + 15 * 60000).toISOString() });
    }
  }
  const reactors = others.slice().sort((a, b) => ((a.length * 31 + idx) % 7) - ((b.length * 31 + idx) % 7)).slice(0, nReact);
  reactors.forEach((r, i) => reactions.push({
    post_id: p.id, user_id: U[r], type: REACTION_TYPES[(idx + i) % REACTION_TYPES.length],
    created_at: new Date(new Date(p.created_at).getTime() + (i + 1) * 20 * 60000).toISOString(),
  }));
}
P.forEach(seedEngagement);

const postRows = P.map(({ _images, ...rest }) => rest);
const postImages = P.flatMap((p) => p._images.map((url, position) => ({ id: id(), post_id: p.id, url, position })));

// ---------------------------------------------------------------- stories
const stories = [
  { id: id(), author_id: U.divyaK, image_url: IMG.apt2, created_at: ago(2) },
  { id: id(), author_id: U.arr, image_url: IMG.apt3, created_at: ago(5) },
  { id: id(), author_id: U.viren, image_url: IMG.story, created_at: ago(9) },
  { id: id(), author_id: U.aisha, image_url: IMG.reel, created_at: ago(11) },
].map((s) => ({ ...s, expires_at: new Date(new Date(s.created_at).getTime() + 24 * 3600 * 1000).toISOString() }));

// ---------------------------------------------------------------- reels
const reels = [{
  id: id(), author_id: U.corteezyy, thumbnail_url: IMG.reel, video_url: null,
  location: 'Seattle WA', caption: 'Back to normal in the 206...',
  like_count: 4800, comment_count: 267, share_count: 179, save_count: 264, created_at: ago(30),
}];

// ---------------------------------------------------------------- marketplace
const L = {};
const listingDefs = [
  ['moving', 'jdan', 'Moving Sale · Everything must go', 20, 'Seattle, WA', 'Household', IMG.apt1, 'available'],
  ['cabinet', 'kerry', 'Small shoe cabinet', 50, 'Seattle, WA', 'Furniture', IMG.shelf, 'available'],
  ['lulu', 'bethany', 'Lululemon, reformation bundle', 10, 'Seattle, WA', 'Clothing', IMG.bundle, 'available'],
  ['joola', 'nathan', 'JOOLA Pickleball Paddle', 50, 'Seattle, WA', 'Sports', IMG.paddle, 'available'],
  ['bedframe', 'lena', 'Metal bed frame', 30, 'Seattle, WA', 'Furniture', IMG.bed, 'available'],
  ['lamp', 'marcus', 'Paper floor lamp', 18, 'Seattle, WA', 'Home', IMG.lamp, 'available'],
  ['packbundle', 'jdan', 'Pack bundle with 2 pickle balls', 20, 'Seattle, WA', 'Sports', IMG.paddle, 'sold'],
  ['holbrook', 'nathan', 'Holbrook Pickleball Racket', 35, 'Seattle, WA', 'Sports', IMG.paddle, 'available'],
  ['mten', 'rongru', 'MTEN Pickleball Paddle Set', 40, 'Seattle, WA', 'Sports', IMG.paddle, 'available'],
  ['luzz', 'kerry', 'Luzz pickleball paddle', 30, 'Seattle, WA', 'Sports', IMG.paddle, 'available'],
  ['carbon', 'sa', 'Carbon fiber pickleball paddle', 25, 'Bellevue, WA', 'Sports', IMG.paddle, 'available'],
];
const listings = [];
const listingImages = [];
listingDefs.forEach(([k, seller, title, price, location, category, img, status], i) => {
  L[k] = id();
  listings.push({
    id: L[k], seller_id: U[seller], title, description: null, price, currency: 'USD',
    location, category, status, created_at: ago(24 + i * 6),
  });
  listingImages.push({ id: id(), listing_id: L[k], url: img, position: 0 });
});

// Inbox threads: Dhweya is the buyer
const threadDefs = [
  ['packbundle', [['jdan', 'Jdan marked the listing as sold.', true, 'Jun 11']]],
  ['holbrook', [['dhweya', 'Hi, is this still available?', false, 'Jun 8'], ['nathan', 'Nathan is waiting for your response...', true, 'Jun 9']]],
  ['mten', [['dhweya', 'Does it come with a case?', false, 'Jun 7'], ['rongru', 'Yes, comes with the case!', false, 'Jun 8'], ['rongru', 'Also can do $35', false, 'Jun 8']]],
  ['luzz', [['kerry', 'Kerry is waiting for your response...', true, 'Jun 5']]],
  ['carbon', [['dhweya', 'Would you take $20?', false, 'Jun 4'], ['sa', '$25', false, 'Jun 5']]],
];
const threads = [];
const messages = [];
const day = (label) => {
  const m = { Jun: 5 }[label.slice(0, 3)];
  const d = parseInt(label.slice(4), 10);
  return new Date(Date.UTC(new Date().getUTCFullYear(), m, d, 18, 0)).toISOString();
};
threadDefs.forEach(([listing, msgs]) => {
  const tid = id();
  threads.push({ id: tid, listing_id: L[listing], buyer_id: U.dhweya, created_at: day(msgs[0][3]) });
  msgs.forEach(([sender, body, isSystem, date], i) => messages.push({
    id: id(), thread_id: tid, sender_id: U[sender], body, is_system: isSystem,
    read_at: i === msgs.length - 1 ? null : day(date), created_at: day(date),
  }));
});

// ---------------------------------------------------------------- notifications
const notifications = [
  ['generic', null, 'Suggested post from Stabilized: “normalize throwing...”', null, null],
  ['group', null, 'You can now post and comment in Vancouver Rentals & Roomm...', null, 'vanRoommates'],
  ['system', null, 'You’re now using a Meta Account on Facebook.', null, null],
  ['system', null, 'Meta Accounts are coming to Facebook. You’ll be updated to yours soon.', null, null],
  ['post', 'dipali', 'Dipali Modi posted 2 photos.', null, null],
  ['post', 'bethany', 'Bethany Kankelborg added 5 photos.', null, null],
  ['comment', 'dhruvil', 'Dhruvil Modi commented on Dipali Modi’s post.', null, null],
  ['group', 'tom', 'Vancouver Marketplace: “I’m sharing my experience so other Coach buyers can be cautious.”', null, 'vanMarket'],
].map(([type, actor, message, _p, group], i) => ({
  id: id(), user_id: U.dhweya, actor_id: actor ? U[actor] : null, type, message,
  post_id: null, group_id: group ? G[group] : null, read_at: null, created_at: ago((i + 1) * 24 * 7),
}));

// ---------------------------------------------------------------- run
(async () => {
  console.log('Wiping existing mock data...');
  await wipe();
  console.log('Inserting...');
  await insert('fb_users', users);
  await insert('nest_preferences', nestPreferences);
  await insert('fb_friendships', friendships);
  await insert('fb_groups', groups);
  await insert('fb_group_members', groupMembersUniq);
  await insert('fb_posts', postRows);
  await insert('fb_post_images', postImages);
  await insert('fb_comments', comments.filter((c) => !c.parent_id));
  await insert('fb_comments', comments.filter((c) => c.parent_id)); // replies after parents
  await insert('fb_reactions', reactions);
  await insert('fb_stories', stories);
  await insert('fb_reels', reels);
  await insert('fb_marketplace_listings', listings);
  await insert('fb_marketplace_images', listingImages);
  await insert('fb_marketplace_threads', threads);
  await insert('fb_marketplace_messages', messages);
  await insert('fb_notifications', notifications);
  console.log(`Done. Logged-in demo user id: ${U.dhweya}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
