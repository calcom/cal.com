const ws = new WebSocket("ws://localhost:8080");

ws.onopen = function (event) {
  console.log("[open] Connection established");
  console.log("Sending to server");
  ws.send("My name is John");
};

ws.onmessage = function (event) {
  console.log(`[message] Data received from server: ${event.data}`);
};

export default ws;
