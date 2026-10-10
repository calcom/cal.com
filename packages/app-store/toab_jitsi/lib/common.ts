// Auth0 M2M token flow: https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-credentials-flow
import { z } from "zod";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { appKeysSchema } from "../zod";

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
  token_type: z.string().optional(),
});

type ModeratorConfig = {
  moderatorHost: string;
  auth0Domain: string;
  auth0Audience: string;
  auth0TokenUrl?: string;
  auth0ClientId: string;
  auth0ClientSecret: string;
};

let cachedToken: { value: string; expiresAt: number } | undefined;
const REQUIRED_CONFIG_KEYS = [
  "moderatorHost",
  "auth0Domain",
  "auth0Audience",
  "auth0ClientId",
  "auth0ClientSecret",
] as const;
const REQUEST_TIMEOUT_MS = 15_000;

/** Read and validate the required TOAB Jitsi Moderator and Auth0 app settings. */
async function getModeratorConfig(): Promise<ModeratorConfig> {
  const appKeys = appKeysSchema.parse(await getAppKeysFromSlug("toab_jitsi"));
  const config = appKeys;

  const missing = REQUIRED_CONFIG_KEYS.filter((key) => !config[key]);
  if (missing.length) {
    throw new Error(`Missing TOAB Jitsi Moderator configuration: ${missing.join(", ")}`);
  }

  return config as ModeratorConfig;
}

/** Normalize a host value to an origin without a trailing slash. */
function normalizeHost(host: string): string {
  let withScheme = host;
  if (!/^https?:\/\//i.test(host)) withScheme = `https://${host}`;
  return withScheme.replace(/\/+$/, "");
}

/** Retrieve and cache an Auth0 client-credentials token for Moderator requests. */
async function getAccessToken(config: ModeratorConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;

  const tokenUrl = config.auth0TokenUrl || `${normalizeHost(config.auth0Domain)}/oauth/token`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: config.auth0ClientId,
      client_secret: config.auth0ClientSecret,
      audience: config.auth0Audience,
    }),
  });
  if (!response.ok) throw new Error(`Auth0 M2M token request failed (${response.status})`);

  const token = tokenResponseSchema.parse(await response.json());
  cachedToken = { value: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 };
  return token.access_token;
}

/** Make an authenticated Moderator request, retrying once after an expired token. */
export async function moderatorRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = await getModeratorConfig();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${await getAccessToken(config)}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const requestUrl = `${normalizeHost(config.moderatorHost)}${path}`;
  const isCalComDelete = init.method === "DELETE" && path.startsWith("/api/calcom/conferences/");
  if (isCalComDelete) console.info("[toab_jitsi] sending Moderator DELETE", { path });
  const signal = init.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
    : AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  let response = await fetch(requestUrl, { ...init, headers, signal });
  if (response.status === 401) {
    cachedToken = undefined;
    headers.set("Authorization", `Bearer ${await getAccessToken(config)}`);
    const retrySignal = init.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
      : AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    response = await fetch(requestUrl, { ...init, headers, signal: retrySignal });
  }
  if (isCalComDelete) console.info("[toab_jitsi] Moderator DELETE response", { status: response.status });
  if (!response.ok) throw new Error(`Moderator API request failed (${response.status})`);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
