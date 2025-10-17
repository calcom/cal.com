import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import type { BlockingResult } from "../interface/IBlockingService";
import type { GlobalBlockingService } from "./GlobalBlockingService";
import type { OrganizationBlockingService } from "./OrganizationBlockingService";

/**
 * Spam Check Service - Orchestrates spam checking by coordinating blocking checks
 *
 * Checks both global watchlist entries (via GlobalBlockingService) and organization-specific
 * watchlist entries (via OrganizationBlockingService) when an organizationId is provided.
 */
export class SpamCheckService {
  private spamCheckPromise: Promise<BlockingResult> | null = null;

  constructor(
    private readonly globalBlockingService: GlobalBlockingService,
    private readonly organizationBlockingService: OrganizationBlockingService
  ) {}

  startCheck({ email, organizationId }: { email: string; organizationId: number | null }): void {
    this.spamCheckPromise = this.isBlocked(email, organizationId ?? undefined).catch((error) => {
      logger.error("Error starting spam check", safeStringify(error));
      return { isBlocked: false };
    });
  }

  async waitForCheck(): Promise<BlockingResult> {
    if (!this.spamCheckPromise) {
      throw new Error(
        "waitForCheck() called before startCheck(). You must call startCheck() first to initialize spam checking."
      );
    }
    return await this.spamCheckPromise;
  }

  /**
   * Checks if an email is blocked by global or organization-specific watchlist rules
   * Runs both checks in parallel for better performance
   */
  private async isBlocked(email: string, organizationId?: number): Promise<BlockingResult> {
    const checks = [this.globalBlockingService.isBlocked(email)];

    if (organizationId) {
      checks.push(this.organizationBlockingService.isBlocked(email, organizationId));
    }

    const [globalResult, orgResult] = await Promise.all(checks);

    // Global blocking takes precedence
    if (globalResult.isBlocked) {
      return globalResult;
    }

    // Check organization blocking if it was performed
    if (orgResult?.isBlocked) {
      return orgResult;
    }

    return { isBlocked: false };
  }
}
