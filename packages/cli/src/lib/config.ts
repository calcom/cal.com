import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import process from "node:process";

const CONFIG_DIR: string = path.join(os.homedir(), ".calcom");
const CONFIG_FILE: string = path.join(CONFIG_DIR, "config.json");

interface CalConfig {
  apiKey?: string;
  apiUrl?: string;
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
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function getApiKey(): string {
  const config = readConfig();
  const key = process.env.CAL_API_KEY || config.apiKey;
  if (!key) {
    console.error(
      'No API key found. Run "cal login" to set your API key or set the CAL_API_KEY environment variable.'
    );
    process.exit(1);
  }
  return key;
}

export function getApiUrl(): string {
  const config = readConfig();
  return process.env.CAL_API_URL || config.apiUrl || "https://api.cal.com";
}
