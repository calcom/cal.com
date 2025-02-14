import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetTeam } from "@/modules/auth/decorators/get-team/get-team.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsManagedOrgInManagerOrg } from "@/modules/auth/guards/organizations/is-managed-org-in-manager-org.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { CreateOrganizationInput } from "@/modules/organizations/organizations/inputs/create-organization.input";
import { CreateManagedOrganizationOutput } from "@/modules/organizations/organizations/outputs/create-managed-organization.output";
import { ManagedOrganizationOutput } from "@/modules/organizations/organizations/outputs/managed-organization.output";
import { ManagedOrganizationsService } from "@/modules/organizations/organizations/services/organizations-organizations.service";
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
  Headers,
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS, X_CAL_CLIENT_ID } from "@calcom/platform-constants";
import { OrgTeamOutputDto } from "@calcom/platform-types";
import { SkipTakePagination } from "@calcom/platform-types";
import { Team } from "@calcom/prisma/client";

const SCALE = "SCALE";

@Controller({
  path: "/v2/organizations/:managerOrganizationId/organizations",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Orgs")
export class OrganizationsTeamsController {
  constructor(private managedOrganizationsService: ManagedOrganizationsService) {}

  @Post()
  @Roles("ORG_ADMIN")
  @PlatformPlan(SCALE)
  @ApiOperation({ summary: "Create an organization within an organization" })
  async createOrganization(
    @Param("managerOrganizationId", ParseIntPipe) managerOrganizationId: number,
    @GetUser("id") authUserId: number,
    @Body() body: CreateOrganizationInput
  ): Promise<CreateManagedOrganizationOutput> {
    const organization = await this.managedOrganizationsService.createManagedOrganization(
      authUserId,
      managerOrganizationId,
      body
    );

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(ManagedOrganizationOutput, organization, { strategy: "excludeAll" }),
    };
  }

  //   @UseGuards(IsManagedOrgInManagerOrg)
  //   @Roles("TEAM_ADMIN")
  //   @PlatformPlan(PLATFORM_PLAN)
  //   @Get("/:managedOrganizationId")
  //   @ApiOperation({ summary: "Get an organization within an organization" })
  //   async getOrganization(@Param("managedOrganizationId", ParseIntPipe) managedOrganizationId: number): Promise<OrgTeamOutputResponseDto> {
  //     return {
  //       status: SUCCESS_STATUS,
  //       data: plainToClass(OrgTeamOutputDto, team, { strategy: "excludeAll" }),
  //     };
  //   }

  //   @Get()
  //   @ApiOperation({ summary: "Get all organizations" })
  //   @Roles("ORG_ADMIN")
  //   @PlatformPlan(PLATFORM_PLAN)
  //   async getOrganizations(
  //     @Param("orgId", ParseIntPipe) orgId: number,
  //     @Query() queryParams: SkipTakePagination
  //   ): Promise<OrgTeamsOutputResponseDto> {
  //     const { skip, take } = queryParams;
  //     const teams = await this.organizationsTeamsService.getPaginatedOrgTeams(orgId, skip ?? 0, take ?? 250);
  //     return {
  //       status: SUCCESS_STATUS,
  //       data: teams.map((team) => plainToClass(OrgTeamOutputDto, team, { strategy: "excludeAll" })),
  //     };
  //   }

  //   @UseGuards(IsTeamInOrg)
  //   @Roles("ORG_ADMIN")
  //   @PlatformPlan(PLATFORM_PLAN)
  //   @Patch("/:teamId")
  //   @ApiOperation({ summary: "Update an organization" })
  //   async updateOrganization(
  //     @Param("orgId", ParseIntPipe) orgId: number,
  //     @Param("teamId", ParseIntPipe) teamId: number,
  //     @Body() body: UpdateOrgTeamDto
  //   ): Promise<OrgTeamOutputResponseDto> {
  //     const team = await this.organizationsTeamsService.updateOrgTeam(orgId, teamId, body);
  //     return {
  //       status: SUCCESS_STATUS,
  //       data: plainToClass(OrgTeamOutputDto, team, { strategy: "excludeAll" }),
  //     };
  //   }

  //   @UseGuards(IsTeamInOrg)
  //   @Roles("ORG_ADMIN")
  //   @PlatformPlan(PLATFORM_PLAN)
  //   @Delete("/:teamId")
  //   @ApiOperation({ summary: "Delete an organization" })
  //   async deleteOrganzation(
  //     @Param("orgId", ParseIntPipe) orgId: number,
  //     @Param("teamId", ParseIntPipe) teamId: number
  //   ): Promise<OrgTeamOutputResponseDto> {
  //     const team = await this.organizationsTeamsService.deleteOrgTeam(orgId, teamId);
  //     return {
  //       status: SUCCESS_STATUS,
  //       data: plainToClass(OrgTeamOutputDto, team, { strategy: "excludeAll" }),
  //     };
  //   }
}
