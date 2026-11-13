// Forwards /api/* from the Expo dev server to the Nest API (server/index.mts), so a phone that can
// reach the bundle can also reach the API. This is what makes `expo start --tunnel` work without a second tunnel.
const http = require("http");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const API_PORT = Number(process.env.EXPO_PUBLIC_NEST_API_PORT || process.env.PORT || 8787);

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    if (!req.url.startsWith("/api/")) return middleware(req, res, next);
    const upstream = http.request(
      { host: "127.0.0.1", port: API_PORT, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${API_PORT}` } },
      (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); },
    );
    upstream.on("error", () => {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: `Nest server is not running on port ${API_PORT}. Start it with "npm run dev".` }));
    });
    req.pipe(upstream);
  },
};

module.exports = config;
