import { createHash } from "node:crypto";

export const sha256Hash = (token: string): string => createHash("sha256").update(token).digest("hex");

const AGENT_KEY_INFIX = "agent_";

export const isApiKey = (authString: string, prefix: string): boolean =>
  authString?.startsWith(prefix ?? "cal_");

export const stripApiKey = (apiKey: string, prefix?: string): string => {
  const basePrefix = prefix ?? "cal_";
  const agentPrefix = `${basePrefix}${AGENT_KEY_INFIX}`;

  if (apiKey.startsWith(agentPrefix)) {
    return apiKey.slice(agentPrefix.length);
  }

  return apiKey.slice(basePrefix.length);
};
