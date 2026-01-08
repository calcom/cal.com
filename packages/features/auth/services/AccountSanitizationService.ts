import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["AccountSanitizationService"] });

/**
 * Service responsible for sanitizing user accounts during security-sensitive operations
 * Handles the removal of potential attack vectors when an unverified account is linked via
 * OAuth (preventing account pre-hijacking attacks).
 */
export class AccountSanitizationService {
  constructor(private prismaClient: PrismaClient) {}

  async sanitizeUnverifiedAccount(userId: number): Promise<void> {
    log.info("Sanitizing unverified account for OAuth link", { userId });

    await this.prismaClient.$transaction([
      this.prismaClient.webhook.deleteMany({ where: { userId } }),
      this.prismaClient.apiKey.deleteMany({ where: { userId } }),
      this.prismaClient.credential.deleteMany({ where: { userId } }),
      this.prismaClient.session.deleteMany({ where: { userId } }),
      this.prismaClient.eventType.updateMany({
        where: { userId },
        data: { successRedirectUrl: null },
      }),
    ]);

    log.info("Account sanitization completed", { userId });
  }
}
