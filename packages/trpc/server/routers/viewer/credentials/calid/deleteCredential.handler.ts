import handleDeleteCredential from "@calid/features/modules/credentials/handledeleteCredential";

import type { PrismaClient } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { disableSyncedCalendarsOnDisconnect } from "../disableSyncedCalendarsOnDisconnect";
import type { TCalIdDeleteCredentialInputSchema } from "./deleteCredential.schema";

type CalIdDeleteCredentialOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCalIdDeleteCredentialInputSchema;
};

export const deleteCredentialHandler = async ({ ctx, input }: CalIdDeleteCredentialOptions) => {
  const { user } = ctx;
  const { id, teamId } = input;

  await disableSyncedCalendarsOnDisconnect({
    prisma: ctx.prisma,
    credentialId: id,
    userId: user.id,
    teamId,
  });

  await handleDeleteCredential({
    userId: user.id,
    userMetadata: user.metadata,
    credentialId: id,
    calIdTeamId: teamId,
  });
};
