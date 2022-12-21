import { Prisma } from "@prisma/client";

export const safeCredentialSelect = Prisma.validator<Prisma.CredentialSelect>()({
  id: true,
  type: true,
  /** Omitting to avoid frontend leaks */
  // key: true,
  userId: true,
  appId: true,
  invalid: true,
});
