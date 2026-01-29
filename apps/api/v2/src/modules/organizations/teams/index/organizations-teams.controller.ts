import { SUCCESS_STATUS, X_CAL_CLIENT_ID } from "@calcom/platform-constants";
import { OrgTeamOutputDto, SkipTakePagination } from "@calcom/platform-types";
import type { Team } from "@calcom/prisma/client";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";
import { Request } from "express";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  OPTIONAL_API_KEY_HEADER,
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
} from "@/lib/docs/headers";
import { Throttle } from "@/lib/endpoint-throttler-decorator";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetTeam } from "@/modules/auth/decorators/get-team/get-team.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizations-membership.service";
import { CreateOrgTeamDto } from "@/modules/organizations/teams/index/inputs/create-organization-team.input";
import { UpdateOrgTeamDto } from "@/modules/organizations/teams/index/inputs/update-organization-team.input";
import {
  OrgMeTeamOutputDto,
  OrgMeTeamsOutputResponseDto,
  OrgTeamOutputResponseDto,
  OrgTeamsOutputResponseDto,
} from "@/modules/organizations/teams/index/outputs/organization-team.output";
import { OrganizationsTeamsService } from "@/modules/organizations/teams/index/services/organizations-teams.service";
import { UserWithProfile } from "@/modules/users/users.repository";

@Controller({
  path: "/v2/organizations/:orgId/teams",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Teams")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsTeamsController {
  constructor(
    private organizationsTeamsService: OrganizationsTeamsService,
    private organizationsMembershipService: OrganizationsMembershipService
  ) {}

  @Get()
  @ApiOperation({ summary: "Get all teams" })
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  async getAllTeams(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<OrgTeamsOutputResponseDto> {
    const { skip, take } = queryParams;
    const teams = await this.organizationsTeamsService.getPaginatedOrgTeams(orgId, skip ?? 0, take ?? 250);
    return {
      status: SUCCESS_STATUS,
      data: teams.map((team) => plainToClass(OrgTeamOutputDto, team, { strategy: "excludeAll" })),
    };
  }

  @Get("/me")
  @ApiOperation({ summary: "Get teams membership for user" })
  @Roles("ORG_MEMBER")
  @PlatformPlan("ESSENTIALS")
  async getMyTeams(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Query() queryParams: SkipTakePagination,
    @GetUser() user: UserWithProfile
  ): Promise<OrgMeTeamsOutputResponseDto> {
    const { skip, take } = queryParams;
    const isOrgAdminOrOwner = await this.organizationsMembershipService.isOrgAdminOrOwner(orgId, user.id);
    const teams = isOrgAdminOrOwner
      ? await this.organizationsTeamsService.getPaginatedOrgTeamsWithMembers(orgId, skip ?? 0, take ?? 250)
      : await this.organizationsTeamsService.getPaginatedOrgUserTeams(orgId, user.id, skip ?? 0, take ?? 250);

    return {
      status: SUCCESS_STATUS,
      data: teams.map((team) => {
        const me = team.members.find((member) => member.userId === user.id);
        return plainToClass(
          OrgMeTeamOutputDto,
          me ? { ...team, role: me.role, accepted: me.accepted } : team,
          { strategy: "excludeAll" }
        );
      }),
    };
  }

  @UseGuards(IsTeamInOrg)
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Get("/:teamId")
  @ApiOperation({ summary: "Get a team" })
  async getTeam(@GetTeam() team: Team): Promise<OrgTeamOutputResponseDto> {
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgTeamOutputDto, team, { strategy: "excludeAll" }),
    };
  }

  @UseGuards(IsTeamInOrg)
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Delete("/:teamId")
  @Throttle({ limit: 1, ttl: 1000, blockDuration: 1000, name: "org_teams_delete" })
  @ApiOperation({ summary: "Delete a team" })
  async deleteTeam(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<OrgTeamOutputResponseDto> {
    const team = await this.organizationsTeamsService.deleteOrgTeam(orgId, teamId);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgTeamOutputDto, team, { strategy: "excludeAll" }),
    };
  }

  @UseGuards(IsTeamInOrg)
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Patch("/:teamId")
  @ApiOperation({ summary: "Update a team" })
  async updateTeam(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() body: UpdateOrgTeamDto
  ): Promise<OrgTeamOutputResponseDto> {
    const team = await this.organizationsTeamsService.updateOrgTeam(orgId, teamId, body);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgTeamOutputDto, team, { strategy: "excludeAll" }),
    };
  }

  @Post()
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @ApiOperation({ summary: "Create a team" })
  async createTeam(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Body() body: CreateOrgTeamDto,
    @GetUser() user: UserWithProfile,
    @Req() req: Request
  ): Promise<OrgTeamOutputResponseDto> {
    const oAuthClientId = req.headers[X_CAL_CLIENT_ID] as string | undefined;
    const team = oAuthClientId
      ? await this.organizationsTeamsService.createPlatformOrgTeam(orgId, oAuthClientId, body, user)
      : await this.organizationsTeamsService.createOrgTeam(orgId, body, user);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgTeamOutputDto, team, { strategy: "excludeAll" }),
    };
  }
}
