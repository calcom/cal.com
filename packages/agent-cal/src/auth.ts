/**
 * Auth helpers for Agent Cal.
 * Use AgentCal with apiKey or accessToken from env or credential store.
 */

import type { AgentCalOptions } from "./types.js";
import { getCredentialsPath, isTokenExpired, type StoredCredentials } from "./utils/token.js";

/**
 * Build AgentCal options from environment variables.
 * - CAL_API_KEY or CAL_ACCESS_TOKEN for auth
 * - CAL_API_BASE_URL for base URL (optional)
 */
export function getOptionsFromEnv(): AgentCalOptions {
  const apiKey = process.env.CAL_API_KEY;
  const accessToken = process.env.CAL_ACCESS_TOKEN;
  if (!apiKey && !accessToken) {
    throw new Error("Set CAL_API_KEY or CAL_ACCESS_TOKEN in the environment");
  }
  const baseUrl = process.env.CAL_API_BASE_URL;
  return {
    apiKey: apiKey ?? undefined,
    accessToken: accessToken ?? undefined,
    baseUrl: baseUrl ?? undefined,
  };
}

/**
 * Load credentials from ~/.agentcal/credentials.json if the file exists (Node only).
 * Does not throw; returns undefined if file is missing or invalid.
 */
export async function loadStoredCredentials(): Promise<StoredCredentials | undefined> {
  try {
    if (typeof process === "undefined") return undefined;
    const path = getCredentialsPath();
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(path, "utf-8");
    const parsed = JSON.parse(content) as StoredCredentials;
    if (!parsed.accessToken) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

/**
 * Returns options using stored credentials if no apiKey/accessToken provided.
 * When using stored credentials, caller is responsible for refresh (Phase 2).
 */
export function needsRefresh(creds: StoredCredentials): boolean {
  return isTokenExpired(creds.expiresAt) && !!creds.refreshToken;
}

/** Generate a PKCE code verifier (43–128 chars, base64url). */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    throw new Error("crypto.getRandomValues not available");
  }
  return base64UrlEncode(bytes);
}

/** Generate PKCE S256 code challenge from verifier. */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await digestSha256(data);
  return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(bytes: Uint8Array): string {
  const base64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(bytes).toString("base64")
      : (() => {
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return typeof btoa !== "undefined" ? btoa(binary) : "";
        })();
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function digestSha256(data: Uint8Array): Promise<Uint8Array> {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle?.digest) {
    const buf = await globalThis.crypto.subtle.digest(
      "SHA-256",
      data as unknown as BufferSource
    );
    return new Uint8Array(buf);
  }
  const { createHash } = await import("node:crypto");
  const buf = Buffer.from(data as unknown as ArrayBuffer);
  const hash = createHash("sha256").update(buf).digest();
  return new Uint8Array(hash);
}

/** Exchange authorization code for tokens (PKCE public client). */
export async function exchangeCodeForTokens(params: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientId: string;
  tokenUrl?: string;
}): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  const tokenUrl = params.tokenUrl ?? "https://api.cal.com/v2/auth/oauth2/token";
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: params.clientId,
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  const data = JSON.parse(text) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}
