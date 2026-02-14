import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  OPTIONAL_API_KEY_HEADER,
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
} from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { OrganizationMembershipService } from "@/lib/services/organization-membership.service";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { CreateOrgTeamMembershipDto } from "@/modules/organizations/teams/memberships/inputs/create-organization-team-membership.input";
import { UpdateOrgTeamMembershipDto } from "@/modules/organizations/teams/memberships/inputs/update-organization-team-membership.input";
import {
  OrgTeamMembershipsOutputResponseDto,
  OrgTeamMembershipOutputResponseDto,
} from "@/modules/organizations/teams/memberships/outputs/organization-teams-memberships.output";
import { OrganizationsTeamsMembershipsService } from "@/modules/organizations/teams/memberships/services/organizations-teams-memberships.service";
import { TeamMembershipOutput } from "@/modules/teams/memberships/outputs/team-membership.output";
import {
  Controller,
  UseGuards,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Delete,
  Patch,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  UnprocessableEntityException,
  Logger,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { updateNewTeamMemberEventTypes } from "@calcom/platform-libraries/event-types";
import { SkipTakePagination } from "@calcom/platform-types";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId/memberships",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Teams / Memberships")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsTeamsMembershipsController {
  private logger = new Logger("OrganizationsTeamsMembershipsController");

  constructor(
    private organizationsTeamsMembershipsService: OrganizationsTeamsMembershipsService,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly orgMembershipService: OrganizationMembershipService
  ) {}

  @Get("/")
  @ApiOperation({ summary: "Get all memberships" })
  @UseGuards()
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @HttpCode(HttpStatus.OK)
  async getAllOrgTeamMemberships(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<OrgTeamMembershipsOutputResponseDto> {
    const { skip, take } = queryParams;
    const orgTeamMemberships = await this.organizationsTeamsMembershipsService.getPaginatedOrgTeamMemberships(
      orgId,
      teamId,
      skip ?? 0,
      take ?? 250
    );
    return {
      status: SUCCESS_STATUS,
      data: orgTeamMemberships.map((membership) =>
        plainToClass(TeamMembershipOutput, membership, { strategy: "excludeAll" })
      ),
    };
  }

  @Get("/:membershipId")
  @ApiOperation({ summary: "Get a membership" })
  @UseGuards()
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @HttpCode(HttpStatus.OK)
  async getOrgTeamMembership(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("membershipId", ParseIntPipe) membershipId: number
  ): Promise<OrgTeamMembershipOutputResponseDto> {
    const orgTeamMembership = await this.organizationsTeamsMembershipsService.getOrgTeamMembership(
      orgId,
      teamId,
      membershipId
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamMembershipOutput, orgTeamMembership, { strategy: "excludeAll" }),
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Delete("/:membershipId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a membership" })
  async deleteOrgTeamMembership(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("membershipId", ParseIntPipe) membershipId: number
  ): Promise<OrgTeamMembershipOutputResponseDto> {
    const membership = await this.organizationsTeamsMembershipsService.deleteOrgTeamMembership(
      orgId,
      teamId,
      membershipId
    );

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamMembershipOutput, membership, { strategy: "excludeAll" }),
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Patch("/:membershipId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update a membership" })
  async updateOrgTeamMembership(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("membershipId", ParseIntPipe) membershipId: number,
    @Body() data: UpdateOrgTeamMembershipDto
  ): Promise<OrgTeamMembershipOutputResponseDto> {
    const currentMembership = await this.organizationsTeamsMembershipsService.getOrgTeamMembership(
      orgId,
      teamId,
      membershipId
    );
    const updatedMembership = await this.organizationsTeamsMembershipsService.updateOrgTeamMembership(
      orgId,
      teamId,
      membershipId,
      data
    );

    if (!currentMembership.accepted && updatedMembership.accepted) {
      try {
        await updateNewTeamMemberEventTypes(updatedMembership.userId, teamId);
      } catch (err) {
        this.logger.error("Could not update new team member eventTypes", err);
      }
    }

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamMembershipOutput, updatedMembership, { strategy: "excludeAll" }),
    };
  }

  // TODO: Refactor to use inviteMembersWithNoInviterPermissionCheck when it is moved to a Service
  // See: packages/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler.ts
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a membership" })
  async createOrgTeamMembership(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() data: CreateOrgTeamMembershipDto
  ): Promise<OrgTeamMembershipOutputResponseDto> {
    const user = await this.organizationsRepository.findOrgUser(Number(orgId), Number(data.userId));

    if (!user) {
      throw new UnprocessableEntityException("User is not part of the Organization");
    }

    const shouldAutoAccept = await this.orgMembershipService.shouldAutoAccept({
      organizationId: orgId,
      userEmail: user.email,
    });

    // ALWAYS override when email matches - prevents pending memberships
    // Remember organizations expect added team member to automatically start receiving bookings for the team event
    const acceptedStatus = shouldAutoAccept ? true : (data.accepted ?? false);

    const membershipData = { ...data, accepted: acceptedStatus };
    const membership = await this.organizationsTeamsMembershipsService.createOrgTeamMembership(
      teamId,
      membershipData
    );

    if (membership.accepted) {
      try {
        await updateNewTeamMemberEventTypes(user.id, teamId);
      } catch (err) {
        this.logger.error("Could not update new team member eventTypes", err);
      }
    }
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamMembershipOutput, membership, { strategy: "excludeAll" }),
    };
  }
}
