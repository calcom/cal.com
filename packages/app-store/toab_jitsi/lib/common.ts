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

async function getModeratorConfig(): Promise<ModeratorConfig> {
  const appKeys = appKeysSchema.parse(await getAppKeysFromSlug("toab_jitsi"));
  const config = appKeys;

  const missing = Object.entries(config)
    .filter(([key, value]) => key !== "auth0TokenUrl" && !value)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(`Missing TOAB Jitsi Moderator configuration: ${missing.join(", ")}`);
  }

  return config as ModeratorConfig;
}

function normalizeHost(host: string): string {
  let withScheme = host;
  if (!/^https?:\/\//i.test(host)) withScheme = `https://${host}`;
  return withScheme.replace(/\/+$/, "");
}

async function getAccessToken(config: ModeratorConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;

  const tokenUrl = config.auth0TokenUrl || `${normalizeHost(config.auth0Domain)}/oauth/token`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
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

export async function moderatorRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = await getModeratorConfig();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${await getAccessToken(config)}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const requestUrl = `${normalizeHost(config.moderatorHost)}${path}`;
  const isCalComDelete = init.method === "DELETE" && path.startsWith("/api/calcom/conferences/");
  if (isCalComDelete) console.info("[toab_jitsi] sending Moderator DELETE", { path });
  let response = await fetch(requestUrl, { ...init, headers });
  if (response.status === 401) {
    cachedToken = undefined;
    headers.set("Authorization", `Bearer ${await getAccessToken(config)}`);
    response = await fetch(requestUrl, { ...init, headers });
  }
  if (isCalComDelete) console.info("[toab_jitsi] Moderator DELETE response", { status: response.status });
  if (!response.ok) throw new Error(`Moderator API request failed (${response.status})`);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

