import { OAuthClientRepository, generateSecret } from "@calcom/lib/server/repository/oAuthClient";
import { randomBytes } from "node:crypto";

import { generateSecret } from "@calcom/features/oauth/utils/generateSecret";
import { prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import type { TAddClientInputSchema } from "./addClient.schema";

// Re-export generateSecret for backward compatibility
export { generateSecret };

type AddClientOptions = {
  input: TAddClientInputSchema;
};

export const addClientHandler = async ({ input }: AddClientOptions) => {
  const { name, redirectUri, logo, websiteUrl, enablePkce } = input;

  const oAuthClientRepository = await OAuthClientRepository.withGlobalPrisma();

  // Admin-created clients are auto-approved
  const client = await oAuthClientRepository.create({
    name,
    redirectUri,
    logo,
    websiteUrl,
    enablePkce,
    approvalStatus: "APPROVED",
  });

  return {
    clientId: client.clientId,
    name: client.name,
    redirectUri: client.redirectUri,
    logo: client.logo,
    clientType: client.clientType,
    clientSecret: client.clientSecret,
    isPkceEnabled: enablePkce,
  };
};
