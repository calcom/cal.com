import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { AuditLogCredentialTriggerEvents } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import { piiFreeAppKeyTransformer } from "../../../../lib/tests";
import type { TrpcSessionUser } from "../../../trpc";
import type { TUpdateAppCredentialsInputSchema } from "./updateAppCredentials.schema";
import { handleCustomValidations } from "./updateAppCredentials.validator";

export type UpdateAppCredentialsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateAppCredentialsInputSchema;
};

export const updateAppCredentialsHandler = async ({ ctx, input }: UpdateAppCredentialsOptions) => {
  const { user } = ctx;

  // Find user credential
  const credential = await prisma.credential.findFirst({
    where: {
      id: input.credentialId,
    },
  });

  // Check if credential exists
  if (!credential) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Could not find credential ${input.credentialId}`,
    });
  }

  const validatedKeys = await handleCustomValidations({ ctx, input, appId: credential.appId || "" });

  const updated = await prisma.credential.update({
    where: {
      id: credential.id,
    },
    data: {
      key: {
        ...(credential.key as Prisma.JsonObject),
        ...(validatedKeys as Prisma.JsonObject),
      },
    },
  });

  return {
    result: !!updated,
    // TODO: piiFreeAppKeyTransformer should be implementation specific
    auditLogData: {
      updatedCredential: piiFreeAppKeyTransformer.parse(updated),
      oldCredential: piiFreeAppKeyTransformer.parse(credential),
      trigger: AuditLogCredentialTriggerEvents.CREDENTIAL_KEYS_UPDATED,
    },
  };
};
