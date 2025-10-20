const http = require("http");
const connect = require("connect");
const { createProxyMiddleware } = require("http-proxy-middleware");
const express = require('express');
const app = express();
const apiProxyV1 = createProxyMiddleware({
  target: "http://localhost:3003",
});
const apiProxyV2 = createProxyMiddleware({
  target: "http://localhost:3004",
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/", apiProxyV1);
app.use("/v2", apiProxyV2);
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).send('Access denied. No token provided.');
  try {
    const decoded = jwt.verify(token, 'secretkey');
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).send('Invalid token.');
  }
};
app.use(authMiddleware);
http.createServer(app).listen(3002);