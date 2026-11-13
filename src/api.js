// All Supabase reads/writes for the mock Facebook app.
import { supabase } from './supabase';

// The mock "logged-in" user. Looked up by name so no UUID is hardcoded.
export const ME_NAME = 'Dhweya Modi';

const FALLBACK_ME = {
  id: 'offline-me', name: 'Swayam Arora', avatar_url: 'https://i.pravatar.cc/150?img=12',
  cover_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
  location: 'Seattle, Washington', birthday: '2006-03-03',
};
const FALLBACK_POSTS = [{
  id: 'offline-post', title: '1-Bedroom Apartment Sublet in South Lake Union',
  body: 'Hi everyone! I’m looking to sublet my beautiful apartment in South Lake Union. Message me for details.',
  created_at: new Date().toISOString(), author: FALLBACK_ME,
  group: { id: 'offline-group', name: 'Seattle Apartments and Housing' },
  images: ['https://media.equityapartments.com/images/c_crop%2Cx_0%2Cy_0%2Cw_1920%2Ch_1080/c_fill%2Cw_1920%2Ch_1080/q_80/4216-137/helios-apartments-living-room.jpg'],
  reaction_count: 42, comment_count: 18, share_count: 3, liked: false,
}];

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

export const isSupabaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

let mePromise;
export const getMe = () =>
  (mePromise ||= supabase.from('fb_users').select('*').eq('name', ME_NAME).single().then(ok).catch(() => FALLBACK_ME));

const preferenceRow = (goal, userId) => ({
  user_id: userId,
  raw_prompt: goal.rawPrompt,
  intent: goal.intent,
  city: goal.city,
  preferred_neighborhoods: goal.preferredNeighborhoods,
  start_date: goal.startDate,
  end_date: goal.endDate,
  budget_amount: goal.budgetAmount,
  budget_basis: goal.budgetBasis,
  housing_type: goal.housingType,
  furnished_requirement: goal.furnishedRequirement,
  roommate_count: goal.roommateCount,
  already_has_home: goal.alreadyHasHome,
  must_haves: goal.mustHaves,
  preferences: goal.preferences,
  source_ids: goal.sourceIds,
  max_results: goal.maxResults,
  cadence: goal.cadence,
  notifications_enabled: goal.notificationsEnabled,
  goal_json: goal,
  updated_at: goal.updatedAt,
});

export async function saveNestPreferences(goal) {
  const me = await getMe();
  if (me.id === FALLBACK_ME.id) {
    throw new Error(`Supabase user "${ME_NAME}" was not found`);
  }
  ok(await supabase.from('nest_preferences').upsert(preferenceRow(goal, me.id)));
}

export async function getNestPreferences() {
  const me = await getMe();
  if (me.id === FALLBACK_ME.id) return null;
  const row = await supabase
    .from('nest_preferences')
    .select('goal_json')
    .eq('user_id', me.id)
    .maybeSingle()
    .then(ok);
  return row?.goal_json || null;
}

// ---- feed ---------------------------------------------------------------
const POST_SELECT =
  '*, author:fb_users!author_id(id,name,avatar_url), group:fb_groups(id,name), images:fb_post_images(url,position)';

// Adds reaction/comment counts and whether I liked each post.
async function decoratePosts(posts) {
  if (!posts.length) return [];
  const me = await getMe();
  const ids = posts.map((p) => p.id);
  const [stats, mine] = await Promise.all([
    supabase.from('fb_post_stats').select('*').in('post_id', ids).then(ok),
    supabase.from('fb_reactions').select('post_id').eq('user_id', me.id).in('post_id', ids).then(ok),
  ]);
  const statBy = Object.fromEntries(stats.map((s) => [s.post_id, s]));
  const liked = new Set(mine.map((r) => r.post_id));
  return posts.map((p) => ({
    ...p,
    images: (p.images || []).sort((a, b) => a.position - b.position).map((i) => i.url),
    reaction_count: statBy[p.id]?.reaction_count ?? 0,
    comment_count: statBy[p.id]?.comment_count ?? 0,
    liked: liked.has(p.id),
  }));
}

export async function getFeed(limit = 20) {
  try {
    const posts = await supabase
      .from('fb_posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(limit).then(ok);
    return decoratePosts(posts);
  } catch { return FALLBACK_POSTS; }
}

export async function getGroupPosts(groupIds, limit = 10) {
  try {
    const posts = await supabase
      .from('fb_posts').select(POST_SELECT).in('group_id', groupIds)
      .order('created_at', { ascending: false }).limit(limit).then(ok);
    return decoratePosts(posts);
  } catch { return FALLBACK_POSTS; }
}

export async function getMyPosts(limit = 10) {
  const me = await getMe();
  const posts = await supabase
    .from('fb_posts').select(POST_SELECT).eq('author_id', me.id)
    .order('created_at', { ascending: false }).limit(limit).then(ok);
  return decoratePosts(posts);
}

export async function setLike(postId, liked) {
  const me = await getMe();
  if (liked) {
    ok(await supabase.from('fb_reactions').upsert({ post_id: postId, user_id: me.id, type: 'like' }));
  } else {
    ok(await supabase.from('fb_reactions').delete().eq('post_id', postId).eq('user_id', me.id));
  }
}

export const getStories = () =>
  supabase.from('fb_stories').select('*, author:fb_users(name,avatar_url)')
    .gt('expires_at', new Date(0).toISOString()) // mock data: don't hide "expired" stories
    .order('created_at', { ascending: false }).then(ok).catch(() => []);

// ---- groups -------------------------------------------------------------
export async function getMyGroups() {
  const me = await getMe();
  const rows = await supabase
    .from('fb_group_members').select('pinned, group:fb_groups(*)').eq('user_id', me.id).then(ok);
  return rows
    .map((r) => ({ ...r.group, pinned: r.pinned }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name));
}

export async function getSuggestedGroups() {
  const me = await getMe();
  const mine = await supabase.from('fb_group_members').select('group_id').eq('user_id', me.id).then(ok);
  const mineIds = new Set(mine.map((m) => m.group_id));
  const all = await supabase.from('fb_groups').select('*, members:fb_group_members(count)').then(ok);
  return all
    .filter((g) => !mineIds.has(g.id))
    .map((g) => ({ ...g, member_count: g.members?.[0]?.count ?? 0 }));
}

export async function joinGroup(groupId) {
  const me = await getMe();
  ok(await supabase.from('fb_group_members').upsert({ group_id: groupId, user_id: me.id, role: 'member' }));
}

// ---- marketplace --------------------------------------------------------
export const getListings = () =>
  supabase.from('fb_marketplace_listings')
    .select('*, images:fb_marketplace_images(url,position)')
    .eq('status', 'available').order('created_at', { ascending: false }).limit(30).then(ok)
    .then((rows) => rows.map((l) => ({ ...l, image: l.images?.sort((a, b) => a.position - b.position)[0]?.url }))).catch(() => []);

export async function getThreads() {
  try {
  const me = await getMe();
  const rows = await supabase.from('fb_marketplace_threads').select(
    'id, listing:fb_marketplace_listings(title, seller:fb_users(name), images:fb_marketplace_images(url)),' +
    'messages:fb_marketplace_messages(body, is_system, read_at, created_at, sender_id)'
  ).eq('buyer_id', me.id).then(ok);
  return rows
    .map((t) => {
      const msgs = (t.messages || []).sort((a, b) => a.created_at.localeCompare(b.created_at));
      const last = msgs[msgs.length - 1];
      return {
        id: t.id,
        title: `${t.listing.seller.name} · ${t.listing.title}`,
        image: t.listing.images?.[0]?.url,
        last: last?.body ?? '',
        at: last?.created_at,
        unread: msgs.some((m) => !m.read_at && m.sender_id !== me.id),
      };
    })
    .sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  } catch { return []; }
}

// ---- notifications / profile / reels -----------------------------------
export async function getNotifications() {
  try {
    const me = await getMe();
    return await supabase.from('fb_notifications')
      .select('*, actor:fb_users!actor_id(name,avatar_url)')
      .eq('user_id', me.id).order('created_at', { ascending: false }).then(ok);
  } catch { return []; }
}

export async function getFriends() {
  const me = await getMe();
  const mine = await supabase.from('fb_friendships')
    .select('friend:fb_users!friend_id(id,name,avatar_url)').eq('user_id', me.id).then(ok);
  const friends = mine.map((r) => r.friend);
  const myIds = new Set(friends.map((f) => f.id));
  // mutual friends = friends-of-my-friends who are also my friends
  const theirs = friends.length
    ? await supabase.from('fb_friendships').select('user_id, friend_id')
        .in('user_id', friends.map((f) => f.id)).then(ok)
    : [];
  const mutual = {};
  theirs.forEach((r) => { if (myIds.has(r.friend_id)) mutual[r.user_id] = (mutual[r.user_id] || 0) + 1; });
  return friends.map((f) => ({ ...f, mutual: mutual[f.id] || 0 }));
}

export const getReel = () =>
  supabase.from('fb_reels').select('*, author:fb_users(name)')
    .order('created_at', { ascending: false }).limit(1).then(ok).then((r) => r[0] || null).catch(() => null);
