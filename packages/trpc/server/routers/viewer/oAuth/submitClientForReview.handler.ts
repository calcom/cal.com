import { sendAdminOAuthClientNotification } from "@calcom/emails/oauth-email-service";
import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import { generateSecret, getSecretHint } from "@calcom/features/oauth/utils/generateSecret";
import { validateRedirectUris } from "@calcom/features/oauth/utils/validateRedirectUris";
import { checkIfFreeEmailDomain } from "@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain";
import { getTranslation } from "@calcom/i18n/server";
import type { PrismaClient } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

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
  const { name, purpose, redirectUris, logo, websiteUrl, enablePkce, scopes } = input;
  const userId = ctx.user.id;

  validateRedirectUris(redirectUris);
  const isFreeEmail = await checkIfFreeEmailDomain({ email: ctx.user.email });
  if (isFreeEmail) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Use a company email instead",
    });
  }

  const oAuthClientRepository = new OAuthClientRepository(ctx.prisma);

  let plainSecret: string | undefined;
  let secret: { hashedSecret: string; secretHint: string } | undefined;
  if (!enablePkce) {
    const [hashedSecret, plain] = generateSecret();
    plainSecret = plain;
    secret = { hashedSecret, secretHint: getSecretHint(plain) };
  }

  const client = await oAuthClientRepository.create({
    name,
    purpose,
    redirectUris,
    secret,
    logo,
    websiteUrl,
    enablePkce,
    scopes,
    userId,
    status: "PENDING",
  });

  const t = await getTranslation("en", "common");
  await sendAdminOAuthClientNotification({
    t,
    clientName: client.name,
    purpose: client.purpose,
    clientId: client.clientId,
    redirectUri: client.redirectUris.join(", "),
    submitterEmail: ctx.user.email,
    submitterName: ctx.user.name,
  });

  return {
    clientId: client.clientId,
    name: client.name,
    purpose: client.purpose,
    clientSecret: plainSecret,
    redirectUris: client.redirectUris,
    logo: client.logo,
    clientType: client.clientType,
    status: client.status,
    isPkceEnabled: enablePkce,
  };
};
