import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import type { BlockingResult } from "../interface/IBlockingService";
import type { GlobalBlockingService } from "./GlobalBlockingService";
import type { OrganizationBlockingService } from "./OrganizationBlockingService";

/**
 * Spam Check Service - Orchestrates spam checking by coordinating blocking checks
 *
 * This service checks both global and organization-level blocking in parallel
 * and returns blocked if either check matches.
 */
export class SpamCheckService {
  private spamCheckPromise: Promise<BlockingResult> | null = null;

  constructor(
    private readonly globalBlockingService: GlobalBlockingService,
    private readonly organizationBlockingService: OrganizationBlockingService
  ) {}

  startCheck(email: string, organizationId?: number): void {
    this.spamCheckPromise = this.isBlocked(email, organizationId).catch((error) => {
      logger.error("Error starting spam check", safeStringify(error));
      return { isBlocked: false };
    });
  }

  async waitForCheck(): Promise<BlockingResult> {
    if (!this.spamCheckPromise) {
      return { isBlocked: false };
    }
    return await this.spamCheckPromise;
  }

  /**
   * Checks if an email is blocked by either global or organization-level rules
   * Runs both checks in parallel for performance when organizationId is provided
   */
  private async isBlocked(email: string, organizationId?: number): Promise<BlockingResult> {
    // Always check global blocking
    const globalCheckPromise = this.globalBlockingService.isBlocked(email, organizationId);

    // Only check organization blocking if we have a valid organizationId
    const organizationCheckPromise =
      organizationId && organizationId > 0
        ? this.organizationBlockingService.isEmailBlocked(email, organizationId)
        : null;

    // Run both checks in parallel for better performance
    const [globalResult, organizationResult] = await Promise.all([
      globalCheckPromise,
      organizationCheckPromise,
    ]);

    return {
      isBlocked: globalResult.isBlocked || (organizationResult?.isBlocked ?? false),
    };
  }
}
