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
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
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

export function getAuthToken(): string {
  const config = readConfig();

  const envKey = process.env.CAL_API_KEY;
  if (envKey) {
    return envKey;
  }

  if (config.oauth?.accessToken) {
    if (config.oauth.accessTokenExpiresAt) {
      const expiresAt = new Date(config.oauth.accessTokenExpiresAt).valueOf();
      if (Date.now() >= expiresAt) {
        console.warn("OAuth access token has expired. Please run 'cal login --oauth' to re-authenticate.");
        process.exit(1);
      }
    }
    return config.oauth.accessToken;
  }

  if (config.apiKey) {
    return config.apiKey;
  }

  console.error(
    'No credentials found. Run "cal login" to authenticate with an API key or "cal login --oauth" for OAuth.'
  );
  process.exit(1);
}

export function getApiKey(): string {
  return getAuthToken();
}

export function getApiUrl(): string {
  const config = readConfig();
  return process.env.CAL_API_URL || config.apiUrl || "https://api.cal.com";
}
