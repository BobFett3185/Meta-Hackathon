// One command to run everything: Nest API server + Expo. Ctrl+C stops both.
//   npm run dev            Expo (QR / web) + API
//   npm run dev -- --web   extra args are passed to `expo start`
const { spawn } = require("child_process");
const run = (name, cmd, args) => {
  const p = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  p.on("exit", (code) => { if (code) console.error(`[dev] ${name} exited with code ${code}`); shutdown(); });
  return p;
};
const procs = [
  run("api", "npm", ["run", "server"]),
  run("expo", "npx", ["expo", "start", ...process.argv.slice(2)]),
];
let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  procs.forEach((p) => p.kill("SIGINT"));
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
