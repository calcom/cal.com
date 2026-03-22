import handleDeleteCredential from "@calcom/features/credentials/handleDeleteCredential";
import type { PrismaClient } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TDeleteCredentialInputSchema } from "./deleteCredential.schema";
import { disableSyncedCalendarsOnDisconnect } from "./disableSyncedCalendarsOnDisconnect";

type DeleteCredentialOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TDeleteCredentialInputSchema;
};

export const deleteCredentialHandler = async ({ ctx, input }: DeleteCredentialOptions) => {
  const { user } = ctx;
  const { id, teamId } = input;

  await disableSyncedCalendarsOnDisconnect({
    prisma: ctx.prisma,
    credentialId: id,
    userId: user.id,
    teamId,
  });

  await handleDeleteCredential({ userId: user.id, userMetadata: user.metadata, credentialId: id, teamId });
};
