import { sendAdminOAuthClientNotification } from "@calcom/emails/oauth-email-service";
import { getTranslation } from "@calcom/lib/server/i18n";
import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import { generateSecret } from "@calcom/features/oauth/utils/generateSecret";
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

  let plainSecret: string | undefined;
  let hashedSecret: string | undefined;
  if (!enablePkce) {
    const [hashed, plain] = generateSecret();
    hashedSecret = hashed;
    plainSecret = plain;
  }

  const client = await oAuthClientRepository.create({
    name,
    purpose,
    redirectUri,
    clientSecret: hashedSecret,
    logo,
    websiteUrl,
    enablePkce,
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
    clientSecret: plainSecret,
    redirectUri: client.redirectUri,
    logo: client.logo,
    clientType: client.clientType,
    status: client.status,
    isPkceEnabled: enablePkce,
  };
};
