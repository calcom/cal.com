import handleDeleteCredential from "@calcom/features/credentials/handleDeleteCredential";
import { PrismaMembershipRepository } from "@calcom/features/membership/repositories/PrismaMembershipRepository";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TDeleteCredentialInputSchema } from "./deleteCredential.schema";

type DeleteCredentialOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteCredentialInputSchema;
};

export const deleteCredentialHandler = async ({ ctx, input }: DeleteCredentialOptions) => {
  const { user } = ctx;
  const { id, teamId } = input;

  if (teamId) {
    const membership = await PrismaMembershipRepository.getAdminOrOwnerMembership(user.id, teamId);
    if (!membership) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
  }

  await handleDeleteCredential({ userId: user.id, userMetadata: user.metadata, credentialId: id, teamId });
};
