import { randomBytes, createHash } from "crypto";

import { prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import type { TAddClientInputSchema } from "./addClient.schema";

type AddClientOptions = {
  input: TAddClientInputSchema;
};

export const addClientHandler = async ({ input }: AddClientOptions) => {
  const { name, redirectUri, logo, enablePkce } = input;

  const clientId = randomBytes(32).toString("hex");
  const clientType = enablePkce ? "PUBLIC" : "CONFIDENTIAL";

  // Only generate client secret for confidential clients
  const clientData: Prisma.OAuthClientCreateInput = {
    name,
    redirectUri,
    clientId,
    clientType,
    logo,
  };

  let secret: string | undefined;
  if (!enablePkce) {
    const [hashedSecret, plainSecret] = generateSecret();
    clientData.clientSecret = hashedSecret;
    secret = plainSecret;
  }
  const client = await prisma.oAuthClient.create({
    data: clientData,
  });

  return {
    clientId: client.clientId,
    name: client.name,
    redirectUri: client.redirectUri,
    logo: client.logo,
    clientType: client.clientType,
    clientSecret: secret, // Only return plain secret for confidential clients
    isPkceEnabled: enablePkce,
  };
};

const hashSecretKey = (apiKey: string): string => createHash("sha256").update(apiKey).digest("hex");

// Generate a random secret
export const generateSecret = (secret = randomBytes(32).toString("hex")) => [hashSecretKey(secret), secret];
