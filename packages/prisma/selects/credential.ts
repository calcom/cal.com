import type { Prisma } from "../client";

export const credentialForCalendarServiceSelect: Prisma.CredentialSelect = {
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
  encryptedKey: true,
  invalid: true,
  delegationCredentialId: true,
};

export const safeCredentialSelect: Prisma.CredentialSelect = {
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
};
