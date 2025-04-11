import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { PlatformPlanType } from "@/modules/billing/types";
import { UserWithProfile } from "@/modules/users/users.repository";
import { BadRequestException, ForbiddenException, Injectable, Logger } from "@nestjs/common";

/**
 * Service responsible for platform subscription and access verification
 * This service centralizes access control logic for organization and team-level operations
 */
@Injectable()
export class PlatformSubscriptionService {
  private logger = new Logger("PlatformSubscriptionService");

  constructor(
    private readonly platformPlanGuard: PlatformPlanGuard,
    private readonly isAdminAPIEnabledGuard: IsAdminAPIEnabledGuard,
    private readonly isOrgGuard: IsOrgGuard,
    private readonly isTeamInOrg: IsTeamInOrg,
    private readonly rolesGuard: RolesGuard
  ) {}

  /**
   * Verifies access for organization and team-level operations
   * Checks organization access, admin API enablement, team membership, user roles, and platform plan
   */
  async verifyAccess({
    user,
    orgId,
    teamId,
    requiredRole,
    minimumPlan,
  }: {
    user: UserWithProfile;
    orgId: string;
    teamId?: string;
    requiredRole?: string;
    minimumPlan?: PlatformPlanType;
  }): Promise<{ orgId: number; teamId: number | null }> {
    const userWithAdminFlag = {
      ...user,
      isSystemAdmin: user.role === "ADMIN",
    };

    if (!orgId) {
      throw new BadRequestException("Organization ID is required");
    }

    await this.ensureOrganizationAccess(orgId);
    await this.ensureAdminAPIEnabled(orgId);

    if (teamId && teamId.trim() !== "") {
      await this.ensureTeamBelongsToOrg(orgId, teamId);
    }

    await this.ensureUserRoleAccess(userWithAdminFlag, orgId, teamId, requiredRole);
    await this.ensurePlatformPlanAccess({ teamId, orgId, user: userWithAdminFlag, minimumPlan });

    const parsedOrgId = parseInt(orgId, 10);
    // For organization-level operations, teamId might be empty or null
    const parsedTeamId = teamId && teamId.trim() !== "" ? parseInt(teamId, 10) : null;

    return {
      orgId: parsedOrgId,
      teamId: parsedTeamId,
    };
  }

  /**
   * Ensures the organization exists and is accessible
   */
  private async ensureOrganizationAccess(orgId: string): Promise<void> {
    const { canAccess } = await this.isOrgGuard.checkOrgAccess(orgId);
    if (!canAccess) {
      throw new ForbiddenException("Organization validation failed.");
    }
  }

  /**
   * Ensures the Admin API is enabled for the organization
   */
  private async ensureAdminAPIEnabled(orgId: string): Promise<void> {
    const { canAccess } = await this.isAdminAPIEnabledGuard.checkAdminAPIEnabled(orgId);
    if (!canAccess) {
      throw new ForbiddenException("Admin API is not enabled for this organization.");
    }
  }

  /**
   * Ensures the team belongs to the specified organization
   */
  private async ensureTeamBelongsToOrg(orgId: string, teamId: string): Promise<void> {
    const { canAccess } = await this.isTeamInOrg.checkIfTeamIsInOrg(orgId, teamId);
    if (!canAccess) {
      throw new ForbiddenException("Team is not part of the organization.");
    }
  }

  /**
   * Ensures the user has the required role for the operation
   */
  private async ensureUserRoleAccess(
    user: ApiAuthGuardUser,
    orgId: string,
    teamId?: string,
    requiredRole?: string
  ): Promise<void> {
    if (!requiredRole) return;

    // For team-level roles, we need both orgId and teamId
    if (requiredRole.startsWith("TEAM_") && (!teamId || teamId.trim() === "")) {
      throw new ForbiddenException("Team ID is required for team-level role access");
    }

    // Use empty string for teamId if it's an org-level operation
    const effectiveTeamId = teamId && teamId.trim() !== "" ? teamId : "";

    const { canAccess } = await this.rolesGuard.checkUserRoleAccess(
      user,
      orgId,
      effectiveTeamId,
      requiredRole
    );
    if (!canAccess) {
      throw new ForbiddenException("User does not have the required role.");
    }
  }

  /**
   * Ensures the user's organization meets the required platform plan
   */
  private async ensurePlatformPlanAccess({
    teamId,
    orgId,
    user,
    minimumPlan,
  }: {
    teamId?: string;
    orgId?: string;
    user: ApiAuthGuardUser;
    minimumPlan?: PlatformPlanType;
  }): Promise<void> {
    if (!minimumPlan) return;

    const { canAccess } = await this.platformPlanGuard.checkPlatformPlanAccess({
      teamId,
      orgId,
      user,
      minimumPlan,
    });
    if (!canAccess) {
      throw new ForbiddenException("User's organization does not meet the required subscription plan.");
    }
  }
}
