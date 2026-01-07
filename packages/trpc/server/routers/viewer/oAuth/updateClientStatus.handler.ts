import { TRPCError } from "@trpc/server";

import { sendOAuthClientApprovedNotification } from "@calcom/emails/oauth-email-service";
import { getTranslation } from "@calcom/lib/server/i18n";
import { OAuthClientRepository } from "@calcom/lib/server/repository/oAuthClient";
import { UserPermissionRole } from "@calcom/prisma/enums";
import type { OAuthClientApprovalStatus } from "@calcom/prisma/enums";

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

type UpdateClientStatusOutput = {
  clientId: string;
  name: string;
  approvalStatus: OAuthClientApprovalStatus;
  clientSecret: string | undefined;
};

export const updateClientStatusHandler = async ({
  ctx,
  input,
}: UpdateClientStatusOptions): Promise<UpdateClientStatusOutput> => {
  const { clientId, status } = input;

  // Defense-in-depth: Only instance admins can update OAuth client status
  if (ctx.user.role !== UserPermissionRole.ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update OAuth client status" });
  }

  const oAuthClientRepository = await OAuthClientRepository.withGlobalPrisma();

  // Get client with user info before updating
  const clientWithUser = await oAuthClientRepository.findByClientIdIncludeUser(clientId);

  const updatedClient = await oAuthClientRepository.updateStatus(clientId, status);

  let clientSecret: string | undefined;

  // Send approval notification email to user if approved
  if (status === "APPROVED" && clientWithUser?.user) {
    const t = await getTranslation("en", "common");

    // Only regenerate secret for confidential clients that are being approved for the first time
    // (transitioning from non-APPROVED status to APPROVED)
    const isFirstApproval = clientWithUser.approvalStatus !== "APPROVED";
    const isConfidentialClient = updatedClient.clientType === "CONFIDENTIAL";

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
    });
  }

  return {
    clientId: updatedClient.clientId,
    name: updatedClient.name,
    approvalStatus: updatedClient.approvalStatus,
    clientSecret,
  };
};
