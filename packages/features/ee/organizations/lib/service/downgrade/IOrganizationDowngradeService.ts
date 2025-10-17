import type { ConflictResolutionResult } from "./conflictResolutionUtils";

export type DowngradeBlocker = {
  type: "annual_contract" | "platform_dependency" | "active_integration" | "insufficient_permissions";
  message: string;
  details?: Record<string, unknown>;
};

export type DowngradeWarning = {
  type: "data_loss" | "billing_change" | "url_change" | "feature_loss";
  message: string;
  details?: Record<string, unknown>;
};

export type DowngradeValidationResult = {
  canDowngrade: boolean;
  blockers: DowngradeBlocker[];
  warnings: DowngradeWarning[];
  conflictResolutions: ConflictResolutionResult;
  teamsPreview: Array<{
    teamId: number;
    teamName: string;
    currentSlug: string;
    newSlug: string;
    memberCount: number;
    hasSlugConflict: boolean;
  }>;
  orgEventTypesToDelete: Array<{
    id: number;
    title: string;
    slug: string;
    length: number;
  }>;
  membersToRemove: Array<{
    userId: number;
    email: string;
    username: string | null;
  }>;
  estimatedCost: {
    current: {
      totalMonthly: number;
      seats: number;
      pricePerSeat: number;
    };
    afterDowngrade: {
      totalMonthly: number;
      teams: Array<{
        teamId: number;
        teamName: string;
        seats: number;
        pricePerSeat: number;
        monthlyTotal: number;
      }>;
    };
  };
  availableTeamsForCredits: Array<{
    teamId: number;
    teamName: string;
    memberCount: number;
  }>;
  organizationCredits: number;
};

export type DowngradeResult = {
  success: boolean;
  organizationId: number;
  deletedAt: Date;
  teams: Array<{
    teamId: number;
    teamName: string;
    newSlug: string;
    subscriptionId: string | null;
    memberCount: number;
  }>;
  removedMembers: Array<{
    userId: number;
    email: string;
  }>;
  conflictResolutions: ConflictResolutionResult;
  errors?: string[];
};

/**
 * Interface for organization downgrade services.
 * Implementations handle different downgrade flows (billing-enabled vs self-hosted).
 */
export interface IOrganizationDowngradeService {
  /**
   * Validates whether an organization can be downgraded.
   * Checks for blockers (contracts, dependencies) and provides preview of changes.
   *
   * @param organizationId - ID of the organization to validate
   * @returns Validation result with blockers, warnings, and conflict resolutions
   */
  validateDowngrade(organizationId: number): Promise<DowngradeValidationResult>;

  /**
   * Executes the downgrade process for an organization.
   * Depending on the implementation:
   * - BillingEnabled: Cancels org subscription, creates team subscriptions
   * - SelfHosted: Validates license, extracts teams without billing changes
   *
   * @param organizationId - ID of the organization to downgrade
   * @param adminUserId - Optional ID of the admin performing the downgrade (for audit logging)
   * @param targetTeamIdForCredits - Optional ID of the team to receive organization credits. If not provided, credits are distributed evenly.
   * @returns Downgrade result with team details, subscriptions, and conflict resolutions
   */
  downgradeOrganization(
    organizationId: number,
    adminUserId?: number,
    targetTeamIdForCredits?: number
  ): Promise<DowngradeResult>;
}
