/**
 * Token storage and refresh utilities for Agent Cal.
 * Used by the CLI to persist credentials under ~/.agentcal/
 * SDK consumers can pass apiKey or accessToken directly to AgentCal.
 */

export interface StoredCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix ms
}

const DEFAULT_CREDENTIALS_DIR = "agentcal";
const CREDENTIALS_FILE = "credentials.json";

/**
 * Returns the directory path for storing Agent Cal credentials.
 * Respects XDG_CONFIG_HOME on Linux, else uses home + .config or .agentcal.
 */
export function getCredentialsDir(): string {
  if (typeof process === "undefined" || !process.env.HOME) {
    return `.${DEFAULT_CREDENTIALS_DIR}`;
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) {
    return `${xdg}/${DEFAULT_CREDENTIALS_DIR}`;
  }
  return `${process.env.HOME}/.${DEFAULT_CREDENTIALS_DIR}`;
}

/**
 * Returns the full path to the credentials file.
 */
export function getCredentialsPath(): string {
  return `${getCredentialsDir()}/${CREDENTIALS_FILE}`;
}

/**
 * Check if the token is expired or about to expire (within 5 minutes).
 */
export function isTokenExpired(expiresAt?: number): boolean {
  if (expiresAt == null) return false;
  const bufferMs = 5 * 60 * 1000;
  return Date.now() >= expiresAt - bufferMs;
}

/**
 * Ensure the credentials directory exists (Node only).
 */
export async function ensureCredentialsDir(): Promise<void> {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(getCredentialsDir(), { recursive: true });
}

/**
 * Write credentials to ~/.agentcal/credentials.json (Node only).
 */
export async function writeCredentials(creds: StoredCredentials): Promise<void> {
  await ensureCredentialsDir();
  const path = getCredentialsPath();
  const { writeFile } = await import("node:fs/promises");
  await writeFile(path, JSON.stringify(creds, null, 2), { encoding: "utf-8", mode: 0o600 });
}
