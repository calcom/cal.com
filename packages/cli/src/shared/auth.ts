import { exec } from "node:child_process";
import * as http from "node:http";
import process from "node:process";
import * as readline from "node:readline";
import { getApiUrl, readConfig, writeConfig } from "./config";
import { renderError, renderSuccess } from "./output";
import { errorPage, successPage } from "./templates";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd =
    platform === "darwin"
      ? `open "${url}"`
      : platform === "win32"
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) {
      renderError(`Could not open browser automatically. Please visit:\n  ${url}`);
    }
  });
}

export class ApiKeyAuth {
  constructor(
    private options: {
      apiKey?: string;
      apiUrl?: string;
    } = {}
  ) {}

  async login(): Promise<void> {
    const apiKey = this.options.apiKey || (await prompt("Enter your Cal.com API key: "));
    if (!apiKey) {
      throw new Error("API key is required.");
    }

    const config = readConfig();
    config.apiKey = apiKey;
    if (this.options.apiUrl) {
      config.apiUrl = this.options.apiUrl;
    }

    writeConfig(config);
    renderSuccess("Logged in successfully. Credentials saved to ~/.calcom/config.json");
  }
}

export class OAuthAuth {
  private static readonly DEFAULT_PORT = 8019;
  private static readonly AUTHORIZE_PATH = "/auth/oauth2/authorize";
  private static readonly TOKEN_PATH = "/v2/auth/oauth2/token";
  private static readonly CALLBACK_TIMEOUT = 300000;

  private clientId?: string;
  private clientSecret?: string;
  private port: number;
  private apiUrl?: string;

  constructor(options: { clientId?: string; clientSecret?: string; port?: number; apiUrl?: string } = {}) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.port = options.port || OAuthAuth.DEFAULT_PORT;
    this.apiUrl = options.apiUrl;
  }

  async login(): Promise<void> {
    const clientId = this.clientId || (await prompt("Enter your OAuth Client ID: "));
    if (!clientId) {
      throw new Error("OAuth Client ID is required.");
    }

    const clientSecret = this.clientSecret || (await prompt("Enter your OAuth Client Secret: "));
    if (!clientSecret) {
      throw new Error("OAuth Client Secret is required.");
    }

    if (this.apiUrl) {
      const config = readConfig();
      config.apiUrl = this.apiUrl;
      writeConfig(config);
    }

    const redirectUri = `http://localhost:${this.port}/callback`;
    const authorizeUrl = this.buildAuthorizeUrl(clientId, redirectUri);

    console.log("\nOpening browser for authorization...");
    console.log(`If the browser doesn't open, visit this URL:\n  ${authorizeUrl}\n`);
    openBrowser(authorizeUrl);

    console.log("Waiting for authorization callback...");
    await this.handleOAuthCallback(clientId, clientSecret, redirectUri);
    renderSuccess("OAuth login successful! Tokens saved to ~/.calcom/config.json");
  }

  private buildAuthorizeUrl(clientId: string, redirectUri: string): string {
    const config = readConfig();
    const baseUrl = config.apiUrl || "https://app.cal.com";
    const state = Math.random().toString(36).substring(2, 15);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "READ_PROFILE,READ_BOOKING",
      state,
    });

    return `${baseUrl}${OAuthAuth.AUTHORIZE_PATH}?${params.toString()}`;
  }

  private handleOAuthCallback(clientId: string, clientSecret: string, redirectUri: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        server.close();
        reject(new Error("OAuth authorization timed out after 5 minutes."));
      }, OAuthAuth.CALLBACK_TIMEOUT);

      const server = http.createServer(async (req, res) => {
        if (!req.url) {
          res.writeHead(400);
          res.end("Bad request");
          return;
        }

        const url = new URL(req.url, `http://localhost:${this.port}`);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          const errorDesc = url.searchParams.get("error_description") || error;
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(errorPage(errorDesc));
          clearTimeout(timeout);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(400);
          res.end("Missing authorization code. Please try again.");
          return;
        }

        console.log("Exchanging authorization code for tokens...");

        try {
          const tokens = await this.exchangeCode(clientId, clientSecret, code, redirectUri);
          this.saveTokens(clientId, clientSecret, tokens);
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(successPage());
          clearTimeout(timeout);
          server.close();
          resolve();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Token exchange failed";
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(errorPage(errorMsg));
          clearTimeout(timeout);
          server.close();
          reject(err);
        }
      });

      server.on("error", (err) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start callback server: ${err.message}`));
      });

      server.listen(this.port, "127.0.0.1");
    });
  }

  private async exchangeCode(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string
  ): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}${OAuthAuth.TOKEN_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      try {
        const parsed = JSON.parse(body);
        throw new Error(parsed.error_description || parsed.error || parsed.message || body);
      } catch {
        throw new Error(`Token exchange failed: HTTP ${response.status}`);
      }
    }

    return response.json();
  }

  private saveTokens(
    clientId: string,
    clientSecret: string,
    tokens: { access_token: string; refresh_token: string; expires_in: number }
  ): void {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const config = readConfig();

    config.oauth = {
      clientId,
      clientSecret,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: expiresAt,
    };

    writeConfig(config);
  }

  static async refreshToken(): Promise<void> {
    const config = readConfig();
    if (!config.oauth) {
      throw new Error("No OAuth credentials found. Please run 'calcom login --oauth' first.");
    }

    const { clientId, clientSecret, refreshToken } = config.oauth;
    const apiUrl = getApiUrl();

    const response = await fetch(`${apiUrl}${OAuthAuth.TOKEN_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: HTTP ${response.status}`);
    }

    const tokens = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    config.oauth = {
      ...config.oauth,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: expiresAt,
    };

    writeConfig(config);
  }
}

export async function promptAuthMethod(): Promise<"api-key" | "oauth"> {
  const choice = await prompt(
    "Choose authentication method:\n  1) API Key\n  2) OAuth\nEnter choice (1 or 2): "
  );
  return choice === "2" ? "oauth" : "api-key";
}
