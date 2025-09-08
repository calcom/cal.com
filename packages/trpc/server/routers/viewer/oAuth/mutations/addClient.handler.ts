import { randomBytes, createHash } from "crypto";

import { prisma } from "@calcom/prisma";

import type { TAddClientInputSchema } from "./addClient.schema";

type AddClientOptions = {
  input: TAddClientInputSchema;
};

export const addClientHandler = async ({ input }: AddClientOptions) => {
  const { name, redirectUri, logo } = input;

  const [hashedSecret, secret] = generateSecret();
  const clientId = randomBytes(32).toString("hex");

  const client = await prisma.oAuthClient.create({
    data: {
      name,
      redirectUri,
      clientId,
      clientSecret: hashedSecret,
      logo,
    },
  });

  const clientWithSecret = {
    ...client,
    clientSecret: secret,
  };

  return clientWithSecret;
};

const hashSecretKey = (apiKey: string): string => createHash("sha256").update(apiKey).digest("hex");

// Generate a random secret
export const generateSecret = (secret = randomBytes(32).toString("hex")) => [hashSecretKey(secret), secret];
