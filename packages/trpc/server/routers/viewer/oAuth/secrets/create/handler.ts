import { TRPCError } from "@trpc/server";

import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import { generateSecret, getSecretHint } from "@calcom/features/oauth/utils/generateSecret";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { PrismaClient } from "@calcom/prisma";

import type { TCreateClientSecretInputSchema } from "./schema";

const MAX_CLIENT_SECRETS = 2;

type CreateClientSecretOptions = {
  ctx: {
    user: {
      id: number;
    };
    prisma: PrismaClient;
  };
  input: TCreateClientSecretInputSchema;
};

export const createClientSecretHandler = async ({ ctx, input }: CreateClientSecretOptions) => {
  const { clientId } = input;

  const oAuthClientRepository = new OAuthClientRepository(ctx.prisma);

  const client = await oAuthClientRepository.findByClientId(clientId);
  if (!client) {
    throw new TRPCError({ code: "NOT_FOUND", message: "OAuth Client not found" });
  }

  if (client.userId == null || client.userId !== ctx.user.id) {
    throw new TRPCError({ code: "NOT_FOUND", message: "OAuth Client not found" });
  }

  if (client.clientType !== "CONFIDENTIAL") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Public clients do not use client secrets" });
  }

  const [hashedSecret, plainSecret] = generateSecret();
  const secretHint = getSecretHint(plainSecret);

  let created;
  try {
    created = await oAuthClientRepository.createClientSecretIfUnderLimit(
      { clientId, hashedSecret, secretHint },
      MAX_CLIENT_SECRETS
    );
  } catch (error) {
    if (error instanceof ErrorWithCode && error.code === ErrorCode.BadRequest) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Maximum of ${MAX_CLIENT_SECRETS} secrets allowed. Delete an existing secret first.`,
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create client secret",
    });
  }

  return {
    id: created.id,
    clientSecret: plainSecret,
    secretHint: created.secretHint,
    createdAt: created.createdAt,
  };
};
