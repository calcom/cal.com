const http = require("node:http");
const connect = require("connect");
const { createProxyMiddleware } = require("http-proxy-middleware");

const apiProxyV2 = createProxyMiddleware({
  target: "http://localhost:3004",
});

const app = connect();

app.use("/v2", apiProxyV2);

http.createServer(app).listen(3002);
