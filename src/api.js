// All Supabase reads/writes for the mock Facebook app.
import { supabase } from './supabase';

// The mock "logged-in" user. Looked up by name so no UUID is hardcoded.
export const ME_NAME = 'Dhweya Modi';

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

let mePromise;
export const getMe = () =>
  (mePromise ||= supabase.from('fb_users').select('*').eq('name', ME_NAME).single().then(ok));

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
  const posts = await supabase
    .from('fb_posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(limit).then(ok);
  return decoratePosts(posts);
}

export async function getGroupPosts(groupIds, limit = 10) {
  const posts = await supabase
    .from('fb_posts').select(POST_SELECT).in('group_id', groupIds)
    .order('created_at', { ascending: false }).limit(limit).then(ok);
  return decoratePosts(posts);
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
    .order('created_at', { ascending: false }).then(ok);

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
    .then((rows) => rows.map((l) => ({ ...l, image: l.images?.sort((a, b) => a.position - b.position)[0]?.url })));

export async function getThreads() {
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
}

// ---- notifications / profile / reels -----------------------------------
export async function getNotifications() {
  const me = await getMe();
  return supabase.from('fb_notifications')
    .select('*, actor:fb_users!actor_id(name,avatar_url)')
    .eq('user_id', me.id).order('created_at', { ascending: false }).then(ok);
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
    .order('created_at', { ascending: false }).limit(1).then(ok).then((r) => r[0] || null);
