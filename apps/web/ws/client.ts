export default function useWebSocket({
  onData,
  onError = () => {
    console.log("Websocket onError");
  },
}: {
  onData: (d: string) => void;
  onError?: () => void;
}) {
  const ws = new WebSocket("ws://localhost:8080");

  ws.onopen = function () {
    console.log("[open] Connection established");
  };

  ws.onmessage = function (event: MessageEvent) {
    onData(event.data);
  };

  ws.onerror = function () {
    onError();
  };
}
