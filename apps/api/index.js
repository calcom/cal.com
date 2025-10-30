const http = require("http");
const connect = require("connect");
const { createProxyMiddleware } = require("http-proxy-middleware");

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  const header = Array.isArray(cookieHeader) ? cookieHeader.join(";") : cookieHeader;
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx > -1) {
      const name = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      try {
        cookies[name] = decodeURIComponent(val);
      } catch (e) {
        cookies[name] = val;
      }
    }
  });
  return cookies;
}

const apiProxyV1 = createProxyMiddleware({
  target: "http://localhost:3003",
  onProxyReq: (proxyReq, req /*, res */) => {
    try {
      const cookies = parseCookies(req.headers && req.headers.cookie);
      const tz = cookies["user_timezone"];
      const preferred = cookies["user_timezone_preferred"];

      if (tz) {
        proxyReq.setHeader("x-user-timezone", tz);
      }

      // Forward preferred flag as a separate header if present.
      if (typeof preferred !== "undefined") {
        const prefVal = String(preferred).toLowerCase();
        if (prefVal === "1" || prefVal === "true" || prefVal === "yes") {
          proxyReq.setHeader("x-user-timezone-preferred", "true");
        } else {
          proxyReq.setHeader("x-user-timezone-preferred", preferred);
        }
      }
    } catch (err) {
      // Fail safe - do not interrupt proxying if cookie parsing fails
    }
  },
});

const apiProxyV2 = createProxyMiddleware({
  target: "http://localhost:3004",
  onProxyReq: (proxyReq, req /*, res */) => {
    try {
      const cookies = parseCookies(req.headers && req.headers.cookie);
      const tz = cookies["user_timezone"];
      const preferred = cookies["user_timezone_preferred"];

      if (tz) {
        proxyReq.setHeader("x-user-timezone", tz);
      }

      if (typeof preferred !== "undefined") {
        const prefVal = String(preferred).toLowerCase();
        if (prefVal === "1" || prefVal === "true" || prefVal === "yes") {
          proxyReq.setHeader("x-user-timezone-preferred", "true");
        } else {
          proxyReq.setHeader("x-user-timezone-preferred", preferred);
        }
      }
    } catch (err) {
      // Fail safe - do not interrupt proxying if cookie parsing fails
    }
  },
});

const app = connect();
app.use("/", apiProxyV1);

app.use("/v2", apiProxyV2);

http.createServer(app).listen(3002);