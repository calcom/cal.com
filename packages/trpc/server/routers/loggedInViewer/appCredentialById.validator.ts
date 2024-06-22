import type { Credential } from "@prisma/client";

import { TRPCError } from "@trpc/server";

const CredentialParsers = {
  test: () => import("@calcom/app-store/templates/audit-log-implementation/appCredentialById.validator"),
};

export const handleCredentialParsing = async (credential: Credential) => {
  const credentialParserGetter = CredentialParsers[credential.appId as keyof typeof CredentialParsers];

  // If no validator is found, return credential as is
  if (!credentialParserGetter) return credential;
  try {
    const validator = (await credentialParserGetter()).default;

    return validator.parse(credential);
  } catch (error) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }
};
