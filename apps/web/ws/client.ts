export default function useWebSocket(callback: () => void) {
  const ws = new WebSocket("ws://localhost:8080");

  ws.onopen = function (event) {
    console.log("[open] Connection established");
    console.log("Sending to server");
  };

  ws.onmessage = function (event) {
    console.log(event);
    console.log(`[message] Data received from server: ${event.data}`);
    callback(event.data);
  };

  return {
    ws,
  };
}
