import handleDeleteCredential from "@calid/features/modules/credentials/handledeleteCredential";

import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TCalIdDeleteCredentialInputSchema } from "./deleteCredential.schema";

type CalIdDeleteCredentialOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdDeleteCredentialInputSchema;
};

export const deleteCredentialHandler = async ({ ctx, input }: CalIdDeleteCredentialOptions) => {
  const { user } = ctx;
  const { id, teamId } = input;

  console.log("Deleting credential with id:", id, "for user:", user.id, "and teamId:", teamId);
  await handleDeleteCredential({
    userId: user.id,
    userMetadata: user.metadata,
    credentialId: id,
    calIdTeamId: teamId,
  });
};
