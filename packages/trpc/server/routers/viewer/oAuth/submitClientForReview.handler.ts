import { sendAdminOAuthClientNotification } from "@calcom/emails/oauth-email-service";
import { getTranslation } from "@calcom/i18n/server";
import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import type { PrismaClient } from "@calcom/prisma";

import type { TSubmitClientInputSchema } from "./submitClientForReview.schema";

type SubmitClientOptions = {
  ctx: {
    user: {
      id: number;
      email: string;
      name: string | null;
    };
    prisma: PrismaClient;
  };
  input: TSubmitClientInputSchema;
};

export const submitClientForReviewHandler = async ({ ctx, input }: SubmitClientOptions) => {
  const { name, purpose, redirectUri, logo, websiteUrl, enablePkce } = input;
  const userId = ctx.user.id;

  const oAuthClientRepository = new OAuthClientRepository(ctx.prisma);

  const client = await oAuthClientRepository.create({
    name,
    purpose,
    redirectUri,
    logo,
    websiteUrl,
    enablePkce: true, // Force PKCE for all new clients
    userId,
    status: "PENDING",
  });

  const t = await getTranslation("en", "common");
  await sendAdminOAuthClientNotification({
    t,
    clientName: client.name,
    purpose: client.purpose,
    clientId: client.clientId,
    redirectUri: client.redirectUri,
    submitterEmail: ctx.user.email,
    submitterName: ctx.user.name,
  });

  return {
    clientId: client.clientId,
    name: client.name,
    purpose: client.purpose,
    redirectUri: client.redirectUri,
    logo: client.logo,
    clientType: client.clientType,
    status: client.status,
    isPkceEnabled: true, // we force enablePkce to true on creation
  };
};
