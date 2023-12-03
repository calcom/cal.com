import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("New client connected");
  wss.clients.forEach((client) => {
    client.send(`Server received your message: Fuck`);
  });

  ws.on("message", (message) => {
    console.log(`Received message: ${message}`);
    wss.clients.forEach((client) => {
      client.send(`Server received your message: ${message}`);
    });
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

export function notifyClients(data) {
  wss.clients.forEach((client) => {
    client.send(data);
  });
}
