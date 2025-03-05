import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { PlatformPlanType } from "@/modules/billing/types";
import { OAuthCallbackState } from "@/modules/conferencing/controllers/conferencing.controller";
import { DefaultConferencingAppsOutputDto } from "@/modules/conferencing/outputs/get-default-conferencing-app.output";
import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.repository";
import { ConferencingService } from "@/modules/conferencing/services/conferencing.service";
import { GoogleMeetService } from "@/modules/conferencing/services/google-meet.service";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { Injectable } from "@nestjs/common";

import { GOOGLE_MEET } from "@calcom/platform-constants";
import { CONFERENCING_APPS, CAL_VIDEO } from "@calcom/platform-constants";
import { handleDeleteCredential, teamMetadataSchema } from "@calcom/platform-libraries";

@Injectable()
export class OrganizationsConferencingService {
  private logger = new Logger("OrganizationsConferencingService");

  constructor(
    private readonly conferencingRepository: ConferencingRepository,
    private teamsRepository: TeamsRepository,
    private usersRepository: UsersRepository,
    private readonly googleMeetService: GoogleMeetService,
    private readonly conferencingService: ConferencingService,
    private readonly platformPlanGuard: PlatformPlanGuard,
    private readonly isAdminAPIEnabledGuard: IsAdminAPIEnabledGuard,
    private readonly isOrgGuard: IsOrgGuard,
    private readonly isTeamInOrg: IsTeamInOrg,
    private readonly rolesGuard: RolesGuard
  ) {}

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

    // Only validate team if a teamId is provided
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

  private async ensureOrganizationAccess(orgId: string): Promise<void> {
    const { canAccess } = await this.isOrgGuard.checkOrgAccess(orgId);
    if (!canAccess) {
      throw new ForbiddenException("Organization validation failed.");
    }
  }

  private async ensureAdminAPIEnabled(orgId: string): Promise<void> {
    const { canAccess } = await this.isAdminAPIEnabledGuard.checkAdminAPIEnabled(orgId);
    if (!canAccess) {
      throw new ForbiddenException("Admin API is not enabled for this organization.");
    }
  }

  private async ensureTeamBelongsToOrg(orgId: string, teamId: string): Promise<void> {
    const { canAccess } = await this.isTeamInOrg.checkIfTeamIsInOrg(orgId, teamId);
    if (!canAccess) {
      throw new ForbiddenException("Team is not part of the organization.");
    }
  }

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

  async connectTeamNonOauthApps({ teamId, app }: { teamId: number; app: string }): Promise<any> {
    switch (app) {
      case GOOGLE_MEET:
        return this.googleMeetService.connectGoogleMeetToTeam(teamId);
      default:
        throw new BadRequestException("Invalid conferencing app. Available apps: GOOGLE_MEET.");
    }
  }

  async connectTeamOauthApps({
    decodedCallbackState,
    app,
    code,
    userId,
  }: {
    userId: number;
    app: string;
    decodedCallbackState: OAuthCallbackState;
    code: string;
  }) {
    const user = await this.usersRepository.findByIdWithProfile(userId);
    const { orgId, teamId } = decodedCallbackState;

    if (!orgId) {
      throw new BadRequestException("orgId required");
    }

    if (!user) {
      throw new BadRequestException("user not found");
    }

    // Determine if this is a team-level or organization-level operation
    const isTeamLevel = !!teamId;
    const requiredRole = isTeamLevel ? "TEAM_ADMIN" : "ORG_ADMIN";

    // Verify access with appropriate parameters
    const { orgId: validatedOrgId, teamId: validatedTeamId } = await this.verifyAccess({
      user,
      orgId,
      teamId,
      requiredRole,
      minimumPlan: "ESSENTIALS",
    });

    const entityId = isTeamLevel && validatedTeamId !== null ? validatedTeamId : validatedOrgId;

    return this.conferencingService.connectOauthApps(app, code, userId, decodedCallbackState, entityId);
  }

  async getConferencingApps({ teamId }: { teamId: number }) {
    return this.conferencingRepository.findTeamConferencingApps(teamId);
  }

  async getDefaultConferencingApp({
    teamId,
  }: {
    teamId: number;
  }): Promise<DefaultConferencingAppsOutputDto | undefined> {
    const team = await this.teamsRepository.getById(teamId);
    return teamMetadataSchema.parse(team?.metadata)?.defaultConferencingApp;
  }

  async checkAppIsValidAndConnected(teamId: number, app: string) {
    if (!CONFERENCING_APPS.includes(app)) {
      throw new BadRequestException("Invalid app, available apps are: ", CONFERENCING_APPS.join(", "));
    }
    const credential = await this.conferencingRepository.findTeamConferencingApp(teamId, app);
    console.log("credentiacredentialcredentiall: ", credential);

    if (!credential) {
      throw new BadRequestException(`${app} not connected.`);
    }
    return credential;
  }

  async disconnectConferencingApp({
    teamId,
    user,
    app,
  }: {
    teamId: number;
    user: UserWithProfile;
    app: string;
  }) {
    const credential = await this.checkAppIsValidAndConnected(teamId, app);
    return handleDeleteCredential({
      userId: user.id,
      teamId,
      userMetadata: user?.metadata,
      credentialId: credential.id,
    });
  }

  async setDefaultConferencingApp({ teamId, app }: { teamId: number; app: string }) {
    // cal-video is global, so we can skip this check
    if (app !== CAL_VIDEO) {
      await this.checkAppIsValidAndConnected(teamId, app);
    }
    const team = await this.teamsRepository.setDefaultConferencingApp(teamId, app);
    const metadata = team.metadata as { defaultConferencingApp?: { appSlug?: string } };
    if (metadata?.defaultConferencingApp?.appSlug !== app) {
      throw new InternalServerErrorException(`Could not set ${app} as default conferencing app`);
    }
    return true;
  }
}
