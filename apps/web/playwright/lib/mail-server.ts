import { nanoid } from "nanoid";
import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";
import { SMTPServer } from "smtp-server";
import type { SMTPServerEnvelope, SMTPServerOptions } from "smtp-server";
import { WebSocket, WebSocketServer } from "ws";

export type NamespaceMode = "prepend" | "subdomain";

export type NamespacedWebSocket = WebSocket & {
  id?: string;
  namespace?: string;
  namespaceMode?: NamespaceMode;
};

export const DEFAULT_NAMESPACE_MODE: NamespaceMode = "subdomain";

const parseEnvelope = (envelope: SMTPServerEnvelope) => ({
  from: envelope.mailFrom ? envelope.mailFrom.address : "",
  to: envelope.rcptTo.map((rcpt) => rcpt.address),
});

export class MailServer {
  private smtpServer: SMTPServer;
  private wsServer: WebSocketServer;

  private WS_SERVER_PORT: string | number;
  private EMAIL_SERVER_PORT: string | number;

  private stats = {
    received: 0,
    forwarded: 0,
  };

  private debug = (...args: Parameters<typeof console.log>) => {
    if (process.env.DEBUG) {
      console.log("[MailServer]", ...args);
    }
  };

  private isSubscribed = (namespace: string, mode: NamespaceMode | undefined, address: string) => {
    switch (mode) {
      case "prepend":
        return address.startsWith(namespace);
      case "subdomain":
        return address.split("@")[1]?.split(".")[0] === namespace;
      default:
        return false;
    }
  };

  private onSmtpData: SMTPServerOptions["onData"] = (stream, session, callback) => {
    this.debug(`SMTP ${session.id} data tx start`);
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => {
      chunks.push(chunk);
    });
    stream.on("end", () => {
      this.stats.received++;
      const buffer = Buffer.concat(chunks);
      const envelope = parseEnvelope(session.envelope);
      envelope.to.forEach((to) => {
        const subscribers = Array.from(this.wsServer.clients).filter((client: NamespacedWebSocket) => {
          if (!(typeof client.namespace === "string")) return;
          return this.isSubscribed(client.namespace, client.namespaceMode, to);
        });
        subscribers.forEach((client: NamespacedWebSocket) => {
          if (client.readyState !== WebSocket.OPEN) return;
          this.stats.forwarded++;
          this.debug(`SMTP ${session.id} -> ${envelope.to[0]} -> WS (${client.id}) [${client.namespace}]`);
          client.send(buffer);
        });
      });

      this.debug(`SMTP ${session.id} data tx end`);
      callback();
    });
  };

  private onWebSocketConnection = (ws: NamespacedWebSocket, req: IncomingMessage) => {
    const debug = (...args: Parameters<typeof console.log>) => this.debug(`(${ws.id})`, ...args);

    const url = new URL(req.url ?? "", `ws://localhost:${this.WS_SERVER_PORT}`);

    ws.id = url.searchParams.get("id") ?? nanoid();
    ws.namespace = url.searchParams.get("ns") ?? "";
    ws.namespaceMode = url.searchParams.get("mode") === "prepend" ? "prepend" : DEFAULT_NAMESPACE_MODE;

    debug("client connected on port", req.socket.remotePort);

    ws.on("close", (code, reason) => {
      debug("client disconnected", { code, reason: reason.toString() });
      debug({ stats: this.stats });
    });
    ws.on("error", (err) => console.error("WebSocket error", err));
    ws.on("message", (data) => {
      const message = data.toString();
      debug("received:", message);
    });
  };

  constructor(smtpPort: string | number) {
    this.EMAIL_SERVER_PORT = Number(smtpPort);
    this.WS_SERVER_PORT = this.EMAIL_SERVER_PORT + 1;

    // start websocket server
    const server = createServer((req, res) => {
      res.end(); // send 200 status to help playwright detect when server is up
    });
    this.wsServer = new WebSocketServer({ server });
    server.listen(this.WS_SERVER_PORT);
    this.debug("WebSocket listening");

    // add listeners
    this.wsServer.on("connection", this.onWebSocketConnection);

    // start smtp server
    this.smtpServer = new SMTPServer({
      disabledCommands: ["AUTH", "STARTTLS"],
      onData: this.onSmtpData,
      disableReverseLookup: true,
      logger: !!process.env.DEBUG,
    });
    this.smtpServer.listen(this.EMAIL_SERVER_PORT);
    this.debug("SMTP listening");
  }
}
