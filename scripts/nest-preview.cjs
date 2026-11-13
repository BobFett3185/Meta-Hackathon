const http = require("http");
const fs = require("fs");
const path = require("path");
const root = path.resolve(".tools/nest-web");
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".json": "application/json",
};
http
  .createServer((req, res) => {
    let target = path.resolve(
      root,
      "." + decodeURIComponent(req.url.split("?")[0]),
    );
    if (!target.startsWith(root + path.sep) && target !== root) {
      res.writeHead(403).end();
      return;
    }
    if (target === root || !fs.existsSync(target))
      target = path.join(root, "index.html");
    res.writeHead(200, {
      "Content-Type": mime[path.extname(target)] || "application/octet-stream",
    });
    fs.createReadStream(target).pipe(res);
  })
  .listen(8086, "127.0.0.1", () =>
    console.log("Nest production preview: http://localhost:8086"),
  );
