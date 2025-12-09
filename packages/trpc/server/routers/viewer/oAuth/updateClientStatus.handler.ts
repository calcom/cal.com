import { sendOAuthClientApprovedNotification } from "@calcom/emails/oauth-email-service";
import { getTranslation } from "@calcom/lib/server/i18n";
import { OAuthClientRepository } from "@calcom/lib/server/repository/oAuthClient";

import type { TUpdateClientStatusInputSchema } from "./updateClientStatus.schema";

type UpdateClientStatusOptions = {
  input: TUpdateClientStatusInputSchema;
};

export const updateClientStatusHandler = async ({ input }: UpdateClientStatusOptions) => {
  const { clientId, status } = input;

  const oAuthClientRepository = await OAuthClientRepository.withGlobalPrisma();

  // Get client with user info before updating
  const clientWithUser = await oAuthClientRepository.findByClientIdIncludeUser(clientId);

  const updatedClient = await oAuthClientRepository.updateStatus(clientId, status);

  // Send approval notification email to user if approved
  if (status === "APPROVED" && clientWithUser?.user) {
    const t = await getTranslation("en", "common");
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
  };
};
