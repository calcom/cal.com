import { sendOAuthLegacyScopeNotification } from "@calcom/emails/oauth-email-service";
import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import { getTranslation } from "@calcom/i18n/server";
import type { PrismaClient } from "@calcom/prisma";

type NotifyLegacyOAuthClientsOptions = {
  ctx: {
    prisma: PrismaClient;
  };
};

type NotifyLegacyOAuthClientsOutput = {
  notifiedCount: number;
  skippedCount: number;
};

export const notifyLegacyOAuthClientsHandler = async ({
  ctx,
}: NotifyLegacyOAuthClientsOptions): Promise<NotifyLegacyOAuthClientsOutput> => {
  const oAuthClientRepository = new OAuthClientRepository(ctx.prisma);

  const legacyClients = await oAuthClientRepository.findLegacyClients();

  const t = await getTranslation("en", "common");

  let notifiedCount = 0;
  let skippedCount = 0;

  for (const client of legacyClients) {
    if (!client.user?.email) {
      skippedCount++;
      continue;
    }

    await sendOAuthLegacyScopeNotification({
      t,
      userEmail: client.user.email,
      userName: client.user.name,
      clientName: client.name,
      clientId: client.clientId,
    });

    notifiedCount++;
  }

  return { notifiedCount, skippedCount };
};
