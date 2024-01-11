import { Prisma } from "@prisma/client";

export const credentialForCalendarServiceSelect = Prisma.validator<Prisma.CredentialSelect>()({
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
});

export const safeCredentialSelect = Prisma.validator<Prisma.CredentialSelect>()({
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
});
