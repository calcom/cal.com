import { createHash } from "crypto";

export const hashAPIKey = (apiKey: string): string => createHash("sha256").update(apiKey).digest("hex");

export const isApiKey = (authString: string, prefix: string): boolean =>
  authString?.startsWith(prefix ?? "cal_");

export const stripApiKey = (apiKey: string, prefix?: string): string => apiKey.replace(prefix ?? "cal_", "");
