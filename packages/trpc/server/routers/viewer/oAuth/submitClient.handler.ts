import AdminOAuthClientNotification from "@calcom/emails/templates/admin-oauth-client-notification";
import { getTranslation } from "@calcom/lib/server/i18n";
import { OAuthClientRepository } from "@calcom/lib/server/repository/oAuthClient";

import type { TSubmitClientInputSchema } from "./submitClient.schema";

type SubmitClientOptions = {
  ctx: {
    user: {
      id: number;
      email: string;
      name: string | null;
    };
  };
  input: TSubmitClientInputSchema;
};

export const submitClientHandler = async ({ ctx, input }: SubmitClientOptions) => {
  const { name, redirectUri, logo, enablePkce } = input;
  const userId = ctx.user.id;

  const oAuthClientRepository = await OAuthClientRepository.withGlobalPrisma();

  const client = await oAuthClientRepository.create({
    name,
    redirectUri,
    logo,
    enablePkce,
    userId,
    approvalStatus: "PENDING",
  });

  // Send email notification to team@cal.com
  const t = await getTranslation("en", "common");
  const adminNotification = new AdminOAuthClientNotification({
    t,
    clientName: client.name,
    clientId: client.clientId,
    redirectUri: client.redirectUri,
    submitterEmail: ctx.user.email,
    submitterName: ctx.user.name,
  });
  await adminNotification.sendEmail();

  return {
    clientId: client.clientId,
    name: client.name,
    redirectUri: client.redirectUri,
    logo: client.logo,
    clientType: client.clientType,
    approvalStatus: client.approvalStatus,
    isPkceEnabled: enablePkce,
  };
};
