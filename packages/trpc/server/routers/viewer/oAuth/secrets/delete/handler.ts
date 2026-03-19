import { TRPCError } from "@trpc/server";

import {
  CANNOT_DELETE_LAST_SECRET,
  OAuthClientRepository,
} from "@calcom/features/oauth/repositories/OAuthClientRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { PrismaClient } from "@calcom/prisma";

import type { TDeleteClientSecretInputSchema } from "./schema";

type DeleteClientSecretOptions = {
  ctx: {
    user: {
      id: number;
    };
    prisma: PrismaClient;
  };
  input: TDeleteClientSecretInputSchema;
};

export const deleteClientSecretHandler = async ({ ctx, input }: DeleteClientSecretOptions) => {
  const { clientId, secretId } = input;

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

  try {
    await oAuthClientRepository.deleteClientSecretIfNotLast(secretId, clientId);
  } catch (error) {
    if (error instanceof ErrorWithCode && error.code === ErrorCode.BadRequest) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: CANNOT_DELETE_LAST_SECRET,
      });
    }
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Secret not found or does not belong to this client.",
    });
  }

  return { secretId };
};
