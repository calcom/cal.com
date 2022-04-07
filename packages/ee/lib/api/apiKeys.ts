import { randomBytes } from "crypto";

import prisma from "@calcom/prisma";

export function generateUniqueAPIKey() {
  const apiKey = randomBytes(16).toString("hex");
  const hashedAPIKey = hashAPIKey(apiKey);
  // const exists = await prisma.apiKey.findMany({ where: { hashedKey: hashedAPIKey } });
  // Ensure API key is unique done at db level
  // if (!exists) {
  //   generateUniqueAPIKey();
  // } else {
  return [hashedAPIKey, apiKey];
  // }
}

// Hash the API key
export function hashAPIKey(apiKey: string): string {
  const { createHash } = require("crypto");

  const hashedAPIKey = createHash("sha256").update(apiKey).digest("hex");

  return hashedAPIKey;
}
