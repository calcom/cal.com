#!/usr/bin/env node
/**
 * Agent Cal CLI — auth, connect, status, events list, token-info, disconnect, mcp.
 */

import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { Command } from "commander";
import open from "open";
import {
  AgentCal,
  exchangeCodeForTokens,
  generateCodeChallenge,
  generateCodeVerifier,
  loadStoredCredentials,
  writeCredentials,
  getCredentialsPath,
  getCredentialsDir,
} from "./index.js";

const DEFAULT_PORT = 9876;
// Use the standard OAuth2 authorize endpoint (works on production app.cal.com).
// For local dev, set CAL_OAUTH_AUTHORIZE_URL (e.g. http://localhost:3000/auth/oauth2/authorize).
const AUTHORIZE_URL =
  process.env.CAL_OAUTH_AUTHORIZE_URL ?? "https://app.cal.com/auth/oauth2/authorize";
// When using a local authorize URL, use the same origin for token so the same DB is used.
function getDefaultTokenUrl(): string {
  const u = process.env.CAL_OAUTH_TOKEN_URL;
  if (u) return u;
  try {
    const authUrl = process.env.CAL_OAUTH_AUTHORIZE_URL;
    if (authUrl) {
      const origin = new URL(authUrl).origin;
      return `${origin}/api/auth/oauth/token`;
    }
  } catch (_) {}
  return "https://api.cal.com/v2/auth/oauth2/token";
}
const TOKEN_URL = getDefaultTokenUrl();

const AUTH_CLIENT_ID_HELP = `
  You need a Cal.com OAuth client with redirect URI: http://localhost:9876/callback

  1. Create an OAuth client:
     - Personal: https://app.cal.com/settings/developer/oauth
     - Or your Cal.com instance (e.g. http://localhost:3000/settings/developer/oauth for local)

  2. Add redirect URI: http://localhost:9876/callback
  3. Wait for approval if required (Cal.com admin may need to approve)
  4. Run again with your client ID:
     npx @calcom/agent-cal auth --client-id YOUR_CLIENT_ID
     or: AGENT_CAL_CLIENT_ID=YOUR_CLIENT_ID npx @calcom/agent-cal auth
`;

function log(msg: string): void {
  console.log(msg);
}

/** Escape HTML special characters to prevent XSS in rendered HTML responses. */
function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function createState(): string {
  return randomBytes(16).toString("hex");
}

async function cmdAuth(port: number, clientId: string): Promise<void> {
  const redirectUri = `http://localhost:${port}/callback`;
  const state = createState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl = new URL(AUTHORIZE_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "READ_BOOKING READ_PROFILE");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = req.url ?? "/";
      if (url.startsWith("/callback")) {
        const q = new URL(url, `http://localhost:${port}`).searchParams;
        const code = q.get("code");
        const returnedState = q.get("state");
        const error = q.get("error");
        const errorDescription = q.get("error_description");

        if (error) {
          const detail = errorDescription ? `${error}: ${errorDescription}` : error;
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            `<html><body><p>Authorization failed: ${escapeHtml(detail)}</p><p>You can close this tab.</p></body></html>`
          );
          server.close();
          reject(new Error(`OAuth error: ${detail}`));
          return;
        }

        if (returnedState !== state || !code) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(
            `<html><body><p>Invalid callback (state or code missing).</p><p>You can close this tab.</p></body></html>`
          );
          server.close();
          reject(new Error("Invalid callback"));
          return;
        }

        try {
          const tokens = await exchangeCodeForTokens({
            code,
            redirectUri,
            codeVerifier,
            clientId,
            tokenUrl: TOKEN_URL,
          });
          const expiresAt = tokens.expiresIn
            ? Date.now() + tokens.expiresIn * 1000
            : undefined;
          await writeCredentials({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt,
          });
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            `<html><body><p>Success! Credentials saved to ${getCredentialsPath()}</p><p>You can close this tab and return to the terminal.</p></body></html>`
          );
        } catch (err) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            `<html><body><p>Token exchange failed: ${escapeHtml(String(err))}</p><p>You can close this tab.</p></body></html>`
          );
          server.close();
          reject(err);
          return;
        }
        server.close();
        resolve();
      }
    });

    server.listen(port, () => {
      log("");
      log("  Agent Cal — Connect your calendar");
      log("");
      log("Opening browser for authentication...");
      log(`  -> ${authUrl.toString()}`);
      log("");
      log(`Waiting for authorization... (listening on localhost:${port})`);
      log("");
      open(authUrl.toString()).catch(() => {
        log("Could not open browser. Visit the URL above manually.");
      });
    });

    server.on("error", (err) => {
      reject(err);
    });
  });
}

async function getClient(): Promise<AgentCal> {
  const creds = await loadStoredCredentials();
  if (!creds?.accessToken) {
    throw new Error(
      "Not authenticated. Run: npx @calcom/agent-cal auth\nCredentials path: " + getCredentialsPath()
    );
  }
  const baseUrl = process.env.CAL_API_BASE_URL;
  return new AgentCal({
    accessToken: creds.accessToken,
    ...(baseUrl && { baseUrl }),
  });
}

async function cmdConnect(): Promise<void> {
  const webAppUrl = process.env.NEXT_PUBLIC_WEBAPP_URL ?? process.env.CAL_OAUTH_AUTHORIZE_URL?.replace(/\/auth\/oauth2\/authorize$/, "") ?? "https://app.cal.com";
  const connectUrl = `${webAppUrl}/settings/calendars`;
  log("");
  log("  Agent Cal — Connect a calendar");
  log("");
  log("Opening Cal.com calendar settings...");
  log(`  -> ${connectUrl}`);
  log("");
  log("Add Google, Outlook, or Apple Calendar, then return here and run:");
  log("  npx @calcom/agent-cal status");
  log("");
  await open(connectUrl).catch(() => {
    log("Could not open browser. Visit the URL above manually.");
  });
}

async function cmdStatus(): Promise<void> {
  const cal = await getClient();
  const connections = await cal.getConnections();
  if (connections.length === 0) {
    log("No calendars connected. Run: npx @calcom/agent-cal connect");
    return;
  }
  log("Connected calendars (use connectionId in events list):");
  for (const c of connections) {
    log(`  - ${c.type} (${c.email})  connectionId: ${c.connectionId}`);
  }
}

async function cmdEventsList(connectionId: string | null, from: string, to: string): Promise<void> {
  const cal = await getClient();
  let connId = connectionId;
  if (!connId) {
    const connections = await cal.getConnections();
    if (connections.length === 0) {
      throw new Error("No calendar connections. Run 'agent-cal status' to see connections, or use --connection-id");
    }
    connId = connections[0].connectionId;
    log(`Using first connection: ${connections[0].type} (${connections[0].email})`);
  }
  const events = await cal.listEvents(connId, { from, to });
  if (events.length === 0) {
    log("No events in this range.");
    return;
  }
  log(`Events (${events.length}):`);
  for (const e of events) {
    log(`  ${e.start.time} - ${e.title} (${e.id})`);
  }
}

async function cmdTokenInfo(): Promise<void> {
  const creds = await loadStoredCredentials();
  if (!creds?.accessToken) {
    throw new Error("Not authenticated. Run: npx @calcom/agent-cal auth");
  }
  const masked = creds.accessToken.slice(0, 6) + "..." + creds.accessToken.slice(-4);
  log(`Token:    ${masked}`);
  log(`Refresh:  ${creds.refreshToken ? "present" : "none"}`);
  if (creds.expiresAt) {
    const expiresDate = new Date(creds.expiresAt).toISOString();
    const isExpired = Date.now() >= creds.expiresAt;
    log(`Expires:  ${expiresDate}${isExpired ? " (EXPIRED)" : ""}`);
  } else {
    log("Expires:  unknown");
  }
  log(`File:     ${getCredentialsPath()}`);
}

async function cmdDisconnect(): Promise<void> {
  const path = getCredentialsPath();
  const dir = getCredentialsDir();
  try {
    const { unlink, rmdir } = await import("node:fs/promises");
    await unlink(path);
    try {
      await rmdir(dir);
    } catch {
      // ignore if dir not empty
    }
    log("Credentials removed. You can run 'agent-cal auth' to connect again.");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
      log("No stored credentials found.");
      return;
    }
    throw err;
  }
}

async function main(): Promise<void> {
  const program = new Command();
  program.name("agent-cal").description("Agent Cal — connect and use Cal.com calendars from the CLI").version("0.1.0");

  program
    .command("auth")
    .description("Authenticate and save credentials to ~/.agentcal/")
    .option(
      "-c, --client-id <id>",
      "OAuth client ID (or set AGENT_CAL_CLIENT_ID). Create one at Cal.com Developer OAuth with redirect URI http://localhost:9876/callback"
    )
    .option("-p, --port <number>", "Callback port", (v) => parseInt(v, 10), DEFAULT_PORT)
    .action(async (opts) => {
      const clientId = (opts.clientId ?? process.env.AGENT_CAL_CLIENT_ID ?? "").trim();
      if (!clientId) {
        console.error("Error: OAuth client ID is required." + AUTH_CLIENT_ID_HELP);
        process.exit(1);
      }
      try {
        await cmdAuth(opts.port ?? DEFAULT_PORT, clientId);
        log("");
        log("Credentials saved to " + getCredentialsPath());
        log("");
        log("You can now use Agent Cal in your agent:");
        log('  const cal = new AgentCal(); // auto-load credentials via loadStoredCredentials()');
        log("");
        log("Or run: agent-cal status");
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    });

  program
    .command("connect")
    .description("Open Cal.com to connect a calendar (Google, Outlook, Apple)")
    .action(async () => {
      try {
        await cmdConnect();
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    });

  program
    .command("status")
    .description("Show connected calendars")
    .action(async () => {
      try {
        await cmdStatus();
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    });

  program
    .command("events list")
    .description("List upcoming events (default: first connection, next 7 days)")
    .option("-c, --connection-id <id>", "Calendar connection ID (from 'agent-cal status')")
    .option("-f, --from <date>", "From date (YYYY-MM-DD)")
    .option("-t, --to <date>", "To date (YYYY-MM-DD)")
    .action(async (opts) => {
      const to = opts.to ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const from = opts.from ?? new Date().toISOString().slice(0, 10);
      try {
        await cmdEventsList(opts.connectionId ?? null, from, to);
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    });

  program
    .command("token-info")
    .description("Show token status (masked) and expiry")
    .action(async () => {
      try {
        await cmdTokenInfo();
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    });

  program
    .command("disconnect")
    .description("Remove stored credentials")
    .action(async () => {
      try {
        await cmdDisconnect();
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    });

  program
    .command("mcp")
    .description("Run MCP server (stdio) with calendar tools")
    .action(async () => {
      try {
        const { runMcpServer } = await import("./mcp/server.js");
        await runMcpServer();
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);

  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
}

main();
