import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { CreateOrganizationInput } from "@/modules/organizations/organizations/inputs/create-organization.input";
import { CreateManagedOrganizationOutput } from "@/modules/organizations/organizations/outputs/create-managed-organization.output";
import { ManagedOrganizationOutput } from "@/modules/organizations/organizations/outputs/managed-organization.output";
import { ManagedOrganizationsService } from "@/modules/organizations/organizations/services/managed-organizations.service";
import { Controller, UseGuards, Param, ParseIntPipe, Post, Body } from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

const SCALE = "SCALE";

@Controller({
  path: "/v2/organizations/:orgId/organizations",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Orgs")
export class OrganizationsOrganizationsController {
  constructor(private managedOrganizationsService: ManagedOrganizationsService) {}

  @Post()
  @Roles("ORG_ADMIN")
  @PlatformPlan(SCALE)
  @ApiOperation({ summary: "Create an organization within an organization" })
  async createOrganization(
    @Param("orgId", ParseIntPipe) managerOrganizationId: number,
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

  // todo(Lauris): add endpoint to update api key and when creatingOrg allow to set when does apikey expire

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
