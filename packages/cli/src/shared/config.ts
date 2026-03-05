import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import process from "node:process";

const CONFIG_DIR: string = path.join(os.homedir(), ".calcom");
const CONFIG_FILE: string = path.join(CONFIG_DIR, "config.json");

interface CalConfig {
  apiKey?: string;
  apiUrl?: string;
  oauth?: {
    clientId: string;
    clientSecret: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
  };
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function readConfig(): CalConfig {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as CalConfig;
  } catch {
    return {};
  }
}

export function writeConfig(config: CalConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { encoding: "utf-8", mode: 0o600 });
}

const TOKEN_REFRESH_PATH = "/v2/auth/oauth2/token";

// Buffer of 60 seconds to refresh before actual expiry
const EXPIRY_BUFFER_MS = 60_000;

async function refreshAccessToken(config: CalConfig): Promise<string> {
  if (!config.oauth) {
    throw new Error("No OAuth credentials found. Please run 'calcom login --oauth' first.");
  }

  const { clientId, clientSecret, refreshToken } = config.oauth;
  const apiUrl = process.env.CAL_API_URL || config.apiUrl || "https://api.cal.com";

  const response = await fetch(`${apiUrl}${TOKEN_REFRESH_PATH}`, {
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
    const body = await response.text().catch(() => "");
    let details = "";
    if (body) {
      details = ` Details: ${body}`;
    }
    throw new Error(
      `OAuth token refresh failed (HTTP ${response.status}). Please run 'calcom login --oauth' to re-authenticate.${details}`
    );
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
  return tokens.access_token;
}

function isTokenExpired(expiresAtStr: string): boolean {
  const expiresAt = new Date(expiresAtStr).valueOf();
  if (Number.isNaN(expiresAt)) {
    return true;
  }
  return Date.now() >= expiresAt - EXPIRY_BUFFER_MS;
}

export async function getAuthToken(): Promise<string> {
  const config = readConfig();

  const envKey = process.env.CAL_API_KEY;
  if (envKey) {
    return envKey;
  }

  if (config.oauth?.accessToken) {
    if (config.oauth.accessTokenExpiresAt && isTokenExpired(config.oauth.accessTokenExpiresAt)) {
      try {
        return await refreshAccessToken(config);
      } catch (err) {
        let message = "Token refresh failed";
        if (err instanceof Error) {
          message = err.message;
        }
        console.error(message);
        process.exit(1);
      }
    }
    return config.oauth.accessToken;
  }

  if (config.apiKey) {
    return config.apiKey;
  }

  console.error(
    'No credentials found. Run "calcom login" to authenticate with an API key or "calcom login --oauth" for OAuth.'
  );
  process.exit(1);
}

export async function getApiKey(): Promise<string> {
  return getAuthToken();
}

export function getApiUrl(): string {
  const config = readConfig();
  return process.env.CAL_API_URL || config.apiUrl || "https://api.cal.com";
}
