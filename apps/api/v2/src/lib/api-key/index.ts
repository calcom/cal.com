import { createHash } from "node:crypto";

export const sha256Hash = (token: string): string => createHash("sha256").update(token).digest("hex");

export const isApiKey = (authString: string, prefix: string): boolean =>
  authString?.startsWith(prefix ?? "cal_");

export const stripApiKey = (apiKey: string, prefix?: string): string => apiKey.replace(prefix ?? "cal_", "");
