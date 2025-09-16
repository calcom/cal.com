import crypto from "crypto";

export function sha256Hash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function isApiKey(token: string, prefix = "oh_cal_"): boolean {
  return token.startsWith(prefix) && token.length > prefix.length;
}

export function stripApiKey(apiKey: string, prefix = "oh_cal_"): string {
  if (!apiKey.startsWith(prefix)) {
    throw new Error(`API key must start with ${prefix}`);
  }
  return apiKey.substring(prefix.length);
}

export function generateApiKey(prefix = "oh_cal_"): { apiKey: string; hashedKey: string } {
  const randomString = crypto.randomBytes(32).toString("hex");
  const apiKey = `${prefix}${randomString}`;
  const hashedKey = sha256Hash(randomString);

  return { apiKey, hashedKey };
}
