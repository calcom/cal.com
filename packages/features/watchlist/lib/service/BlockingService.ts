import type { IAuditService } from "../interface/IAuditService";
import type {
  IBlockingService,
  BlockingResult,
  DecoyBookingResponse,
  BookingData,
} from "../interface/IBlockingService";
import type { GlobalBlockingService } from "./GlobalBlockingService";
import type { OrganizationBlockingService } from "./OrganizationBlockingService";

/**
 * Unified Blocking Service - coordinates Global and Organization blocking services
 * This service implements the priority logic: Global entries take precedence over Organization entries
 */
export class BlockingService implements IBlockingService {
  constructor(
    private readonly globalBlockingService: GlobalBlockingService,
    private readonly organizationBlockingService: OrganizationBlockingService,
    private readonly auditService: IAuditService
  ) {}

  async isBlocked(email: string, organizationId?: number): Promise<BlockingResult> {
    // Check global entries first (highest priority)
    const globalResult = await this.globalBlockingService.isBlocked(email, organizationId);
    if (globalResult.isBlocked) {
      return globalResult;
    }

    // Check organization-specific entries if organizationId provided
    if (organizationId) {
      const orgResult = await this.organizationBlockingService.isEmailBlocked(email, organizationId);
      if (orgResult.isBlocked) {
        // Convert OrganizationBlockingResult to BlockingResult format
        return {
          isBlocked: true,
          reason: orgResult.reason,
          watchlistEntry: orgResult.watchlistEntry,
        };
      }
    }

    return { isBlocked: false };
  }

  async createDecoyResponse(bookingData: BookingData): Promise<DecoyBookingResponse> {
    // Delegate to global service for decoy response generation
    return this.globalBlockingService.createDecoyResponse(bookingData);
  }
}
