import { createHash } from "node:crypto";
import prisma from "@calcom/prisma";
import type { ApiKey } from "@calcom/prisma/client";

function hashAPIKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export async function findValidApiKey(apiKey: string, appId: string): Promise<ApiKey | null> {
  const hashedKey = hashAPIKey(apiKey);

  return prisma.apiKey.findFirst({
    where: {
      hashedKey,
      appId,
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
  });
}
