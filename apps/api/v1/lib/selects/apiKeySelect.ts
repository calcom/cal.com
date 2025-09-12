import type { Prisma } from "@calcom/prisma/client";

const safeApiKeySelect = {
  id: true,
  userId: true,
  note: true,
  createdAt: true,
  expiresAt: true,
  lastUsedAt: true,
  /** We might never want to expose these. Leaving this a as reminder. */
  // hashedKey: true,
} satisfies Prisma.ApiKeySelect;

export { safeApiKeySelect };
