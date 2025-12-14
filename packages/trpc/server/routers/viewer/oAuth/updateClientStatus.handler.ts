import { TRPCError } from "@trpc/server";

import { sendOAuthClientApprovedNotification } from "@calcom/emails/oauth-email-service";
import { getTranslation } from "@calcom/lib/server/i18n";
import { OAuthClientRepository } from "@calcom/lib/server/repository/oAuthClient";
import { UserPermissionRole } from "@calcom/prisma/enums";

import type { TUpdateClientStatusInputSchema } from "./updateClientStatus.schema";

type UpdateClientStatusOptions = {
  ctx: {
    user: {
      id: number;
      role: UserPermissionRole;
    };
  };
  input: TUpdateClientStatusInputSchema;
};

export const updateClientStatusHandler = async ({ ctx, input }: UpdateClientStatusOptions) => {
  const { clientId, status } = input;

  // Defense-in-depth: Only instance admins can update OAuth client status
  if (ctx.user.role !== UserPermissionRole.ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update OAuth client status" });
  }

  const oAuthClientRepository = await OAuthClientRepository.withGlobalPrisma();

  // Get client with user info before updating
  const clientWithUser = await oAuthClientRepository.findByClientIdIncludeUser(clientId);

  const updatedClient = await oAuthClientRepository.updateStatus(clientId, status);

  // Send approval notification email to user if approved
  if (status === "APPROVED" && clientWithUser?.user) {
    const t = await getTranslation("en", "common");

    // Only regenerate secret for confidential clients that are being approved for the first time
    // (transitioning from non-APPROVED status to APPROVED)
    const isFirstApproval = clientWithUser.approvalStatus !== "APPROVED";
    const isConfidentialClient = updatedClient.clientType === "CONFIDENTIAL";

    let clientSecret: string | undefined;
    if (isFirstApproval && isConfidentialClient) {
      const regenerated = await oAuthClientRepository.regenerateSecret(clientId);
      clientSecret = regenerated.clientSecret;
    }

    await sendOAuthClientApprovedNotification({
      t,
      userEmail: clientWithUser.user.email,
      userName: clientWithUser.user.name,
      clientName: updatedClient.name,
      clientId: updatedClient.clientId,
      clientSecret,
    });
  }

  return {
    clientId: updatedClient.clientId,
    name: updatedClient.name,
    approvalStatus: updatedClient.approvalStatus,
  };
};
