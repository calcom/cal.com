import type { Prisma } from "@calcom/prisma/client";

export const credentialForCalendarServiceSelect = {
  id: true,
  appId: true,
  type: true,
  userId: true,
  user: {
    select: {
      email: true,
    },
  },
  teamId: true,
  key: true,
  invalid: true,
  delegationCredentialId: true,
} satisfies Prisma.CredentialSelect;

export const safeCredentialSelect = {
  id: true,
  type: true,
  /** Omitting to avoid frontend leaks */
  // key: true,
  userId: true,
  user: {
    select: {
      email: true,
    },
  },
  teamId: true,
  appId: true,
  invalid: true,
  delegationCredentialId: true,
} satisfies Prisma.CredentialSelect;
