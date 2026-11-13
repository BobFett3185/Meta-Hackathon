// Dumps the mock Facebook posts defined in scripts/seed.js to data/mock-posts.json,
// so ingestion can run without Supabase credentials. Does NOT touch the database.
// Run: node scripts/dump-posts.cjs
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "seed.js"), "utf8");
const cut = src.indexOf("const postRows");
if (cut < 0) throw new Error("seed.js layout changed: 'const postRows' not found");
const body = src.slice(0, cut) + "\nreturn { P, groups, users };";
// Fake env: createClient does not connect until used, and the run/wipe section is sliced off.
process.env.EXPO_PUBLIC_SUPABASE_URL ||= "http://localhost";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "unused";
const { P, groups, users } = new Function("require", body)((m) =>
  m === "@supabase/supabase-js" ? { createClient: () => ({}) } : m === "ws" ? {} : require(m));
const gName = Object.fromEntries(groups.map((g) => [g.id, g.name]));
const uName = Object.fromEntries(users.map((u) => [u.id, u.name]));
const uAvatar = Object.fromEntries(users.map((u) => [u.id, u.avatar_url]));
const out = P.map((p) => ({
  id: p.id, communityName: p.group_id ? gName[p.group_id] : null, authorId: p.author_id, authorName: uName[p.author_id], authorAvatar: uAvatar[p.author_id],
  title: p.title, content: [p.title, p.body].filter(Boolean).join("\n"), imageUrls: p._images, createdAt: p.created_at,
}));
fs.mkdirSync(path.join(__dirname, "../data"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "../data/mock-posts.json"), JSON.stringify(out, null, 1));
console.log(`Wrote ${out.length} posts`);
