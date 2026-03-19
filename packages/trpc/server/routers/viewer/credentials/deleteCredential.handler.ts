import handleDeleteCredential from "@calcom/features/credentials/handleDeleteCredential";
import { getMembershipRepository } from "@calcom/features/di/containers/MembershipRepository";
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
    const membershipRepository = getMembershipRepository();
    const membership = await membershipRepository.getAdminOrOwnerMembership(user.id, teamId);
    if (!membership) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
  }

  await handleDeleteCredential({ userId: user.id, userMetadata: user.metadata, credentialId: id, teamId });
};
