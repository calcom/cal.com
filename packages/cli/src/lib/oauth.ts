import { exec } from "node:child_process";
import * as http from "node:http";
import process from "node:process";
import { getApiUrl, readConfig, writeConfig } from "./config";
import { outputError, outputSuccess } from "./output";

const DEFAULT_CALLBACK_PORT = 8019;
const AUTHORIZE_PATH = "/auth/oauth2/authorize";

interface OAuthTokenResponse {
  status: string;
  data: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
  };
}

function buildAuthorizeUrl(clientId: string, redirectUri: string): string {
  const config = readConfig();
  const baseUrl = config.apiUrl || "https://app.cal.com";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "READ_PROFILE",
  });
  return `${baseUrl}${AUTHORIZE_PATH}?${params.toString()}`;
}

function startCallbackServer(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end("Bad request");
        return;
      }

      const url = new URL(req.url, `http://localhost:${port}`);
      const code = url.searchParams.get("code");

      if (!code) {
        res.writeHead(400);
        res.end("Missing authorization code. Please try again.");
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<html><body><h2>Authorization successful!</h2><p>You can close this window and return to the terminal.</p></body></html>"
      );

      server.close();
      resolve(code);
    });

    server.on("error", (err) => {
      reject(new Error(`Failed to start callback server: ${err.message}`));
    });

    server.listen(port, "127.0.0.1", () => {
      /* server is listening */
    });

    setTimeout(() => {
      server.close();
      reject(new Error("OAuth authorization timed out after 5 minutes."));
    }, 300000);
  });
}

async function exchangeCodeForTokens(
  clientId: string,
  clientSecret: string,
  authorizationCode: string
): Promise<OAuthTokenResponse> {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}/v2/oauth/${clientId}/exchange`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authorizationCode}`,
    },
    body: JSON.stringify({ clientSecret }),
  });

  if (!response.ok) {
    let errorMsg: string;
    try {
      const body = await response.text();
      const parsed = JSON.parse(body) as { message?: string };
      errorMsg = parsed.message || body;
    } catch {
      errorMsg = `HTTP ${response.status}`;
    }
    throw new Error(`Token exchange failed: ${errorMsg}`);
  }

  return (await response.json()) as OAuthTokenResponse;
}

async function refreshAccessTokenInternal(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<OAuthTokenResponse> {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}/v2/oauth/${clientId}/refresh`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cal-secret-key": clientSecret,
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed (HTTP ${response.status})`);
  }

  return (await response.json()) as OAuthTokenResponse;
}

async function performOAuthLoginInternal(
  clientId: string,
  clientSecret: string,
  port?: number
): Promise<void> {
  const callbackPort = port || DEFAULT_CALLBACK_PORT;
  const redirectUri = `http://localhost:${callbackPort}/callback`;
  const authorizeUrl = buildAuthorizeUrl(clientId, redirectUri);

  console.log("\nOpening browser for authorization...");
  console.log(`If the browser doesn't open, visit this URL:\n  ${authorizeUrl}\n`);

  openBrowser(authorizeUrl);

  console.log("Waiting for authorization callback...");
  const code = await startCallbackServer(callbackPort);

  console.log("Exchanging authorization code for tokens...");
  const tokenResponse = await exchangeCodeForTokens(clientId, clientSecret, code);

  const config = readConfig();
  config.oauth = {
    clientId,
    accessToken: tokenResponse.data.accessToken,
    refreshToken: tokenResponse.data.refreshToken,
    accessTokenExpiresAt: tokenResponse.data.accessTokenExpiresAt,
    refreshTokenExpiresAt: tokenResponse.data.refreshTokenExpiresAt,
  };
  writeConfig(config);

  outputSuccess("OAuth login successful! Tokens saved to ~/.calcom/config.json");
}

function openBrowser(url: string): void {
  const platform = process.platform;
  let cmd: string;
  if (platform === "darwin") {
    cmd = `open "${url}"`;
  } else if (platform === "win32") {
    cmd = `start "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }
  exec(cmd, (err) => {
    if (err) {
      outputError(`Could not open browser automatically. Please visit:\n  ${url}`);
    }
  });
}

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<OAuthTokenResponse> {
  return await refreshAccessTokenInternal(clientId, clientSecret, refreshToken);
}

export async function performOAuthLogin(
  clientId: string,
  clientSecret: string,
  port?: number
): Promise<void> {
  await performOAuthLoginInternal(clientId, clientSecret, port);
}
