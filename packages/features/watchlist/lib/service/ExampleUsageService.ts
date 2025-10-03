import type { GlobalBlockingService } from "./GlobalBlockingService";
import type { OrganizationBlockingService } from "./OrganizationBlockingService";

/**
 * Example service showing how consumers should use both global and organization services
 * instead of relying on a unified service abstraction
 */
export class ExampleUsageService {
  constructor(
    private readonly globalBlockingService: GlobalBlockingService,
    private readonly organizationBlockingService: OrganizationBlockingService
  ) {}

  /**
   * Example: Check if booking should be blocked
   * Consumer controls the priority and logic flow
   */
  async checkBookingBlocking(
    email: string,
    organizationId?: number
  ): Promise<{
    isBlocked: boolean;
    source: "global" | "organization" | null;
    reason?: string;
  }> {
    // 1. Check global blocking first (highest priority)
    const globalResult = await this.globalBlockingService.isEmailBlocked(email);
    if (globalResult.isBlocked) {
      return {
        isBlocked: true,
        source: "global",
        reason: globalResult.reason,
      };
    }

    // 2. Check organization-specific blocking if org provided
    if (organizationId) {
      const orgResult = await this.organizationBlockingService.isEmailBlocked(email, organizationId);
      if (orgResult.isBlocked) {
        return {
          isBlocked: true,
          source: "organization",
          reason: orgResult.reason,
        };
      }
    }

    return { isBlocked: false, source: null };
  }

  /**
   * Example: Check multiple users with flexible logic
   */
  async checkUsersBlocking(
    users: { email: string; username: string | null; locked: boolean }[],
    organizationId?: number
  ): Promise<{
    hasBlockedUsers: boolean;
    globalBlocked: boolean;
    orgBlocked: boolean;
  }> {
    // Check global blocking
    const globalBlocked = await this.globalBlockingService.areUsersBlocked(users);

    // Check organization blocking if applicable
    let orgBlocked = false;
    if (organizationId) {
      orgBlocked = await this.organizationBlockingService.areUsersBlocked(users, organizationId);
    }

    return {
      hasBlockedUsers: globalBlocked || orgBlocked,
      globalBlocked,
      orgBlocked,
    };
  }

  /**
   * Example: Different priority - check org first, then global
   */
  async checkWithOrgPriority(
    email: string,
    organizationId: number
  ): Promise<{
    isBlocked: boolean;
    source: "global" | "organization" | null;
  }> {
    // 1. Check organization-specific first
    const orgResult = await this.organizationBlockingService.isEmailBlocked(email, organizationId);
    if (orgResult.isBlocked) {
      return { isBlocked: true, source: "organization" };
    }

    // 2. Check global as fallback
    const globalResult = await this.globalBlockingService.isEmailBlocked(email);
    if (globalResult.isBlocked) {
      return { isBlocked: true, source: "global" };
    }

    return { isBlocked: false, source: null };
  }

  /**
   * Example: Only check global (for system-wide operations)
   */
  async checkGlobalOnly(email: string): Promise<boolean> {
    const result = await this.globalBlockingService.isEmailBlocked(email);
    return result.isBlocked;
  }

  /**
   * Example: Only check organization (for org-specific operations)
   */
  async checkOrganizationOnly(email: string, organizationId: number): Promise<boolean> {
    const result = await this.organizationBlockingService.isEmailBlocked(email, organizationId);
    return result.isBlocked;
  }
}
