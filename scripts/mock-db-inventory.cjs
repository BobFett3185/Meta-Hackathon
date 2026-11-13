const { createClient } = require("@supabase/supabase-js");
const tables = [
  "fb_users",
  "fb_groups",
  "fb_group_members",
  "fb_posts",
  "fb_post_images",
  "fb_comments",
  "fb_reactions",
  "fb_marketplace_listings",
  "fb_marketplace_images",
  "fb_marketplace_threads",
  "fb_marketplace_messages",
  "fb_stories",
  "fb_reels",
  "nest_preferences",
];
function client() {
  if (
    !process.env.EXPO_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    throw new Error("Database URL and service role key are required in .env");
  return createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false }, realtime: { transport: require("ws") } },
  );
}
async function inventory(db) {
  const counts = {};
  await Promise.all(
    tables.map(async (table) => {
      const { count, error } = await db
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) throw new Error(`${table}: ${error.message}`);
      counts[table] = count;
    }),
  );
  const { data: groups, error } = await db
    .from("fb_groups")
    .select("id,name")
    .order("name");
  if (error) throw error;
  return { counts, groups };
}
module.exports = { client, inventory };
if (require.main === module)
  inventory(client())
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
