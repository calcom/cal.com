import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import type { BlockingResult } from "../interface/IBlockingService";
import type { GlobalBlockingService } from "./GlobalBlockingService";

/**
 * Spam Check Service - Orchestrates spam checking by coordinating blocking checks
 *
 * GlobalBlockingService handles both global and organization-level blocking internally,
 * so this service only needs to call that single service.
 */
export class SpamCheckService {
  private spamCheckPromise: Promise<BlockingResult> | null = null;

  constructor(private readonly globalBlockingService: GlobalBlockingService) {}

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

    // Run both checks in parallel for better performance
    const [globalResult] = await Promise.all([globalCheckPromise]);

    return {
      isBlocked: globalResult.isBlocked,
    };
  }
}
