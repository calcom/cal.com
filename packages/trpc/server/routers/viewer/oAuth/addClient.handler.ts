import { randomBytes, createHash } from "crypto";

import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TAddClientInputSchema } from "./addClient.schema";

type AddClientOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddClientInputSchema;
};

export const addClientHandler = async ({ ctx, input }: AddClientOptions) => {
  const { name, redirectUri } = input;

  const [hashedSecret, secret] = generateSecret();
  const clientId = randomBytes(32).toString("hex");
  //make sure client Secret is created same as API key

  const client = await prisma.oAuthClient.create({
    data: {
      name,
      redirectUri,
      clientId,
      clientSecret: hashedSecret,
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
