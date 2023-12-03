import express from "express";
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("New client connected");

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

const pub = (data) => {
  wss.clients.forEach((client) => {
    client.send(JSON.stringify(data));
  });
};

const app = express();
app.use(express.json());
const port = 3002;

app.post("/reserve", (req, res) => {
  console.log("reserve");
  // TODO: use ws to send to subscribers
  // ....
  console.log(req.body);
  pub(req.body);
  res.sendStatus(200);
});

app.post("/booking", (req, res) => {
  console.log("booking");
  // TODO: use ws to send to subscribers
  // ....
  console.log(req.body);
  pub(req.body);
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
