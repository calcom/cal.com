import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { CreateOrgTeamMembershipDto } from "@/modules/organizations/inputs/create-organization-team-membership.input";
import { UpdateOrgTeamMembershipDto } from "@/modules/organizations/inputs/update-organization-team-membership.input";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import {
  OrgTeamMembershipOutputDto,
  OrgTeamMembershipsOutputResponseDto,
  OrgTeamMembershipOutputResponseDto,
} from "@/modules/organizations/outputs/organization-teams-memberships.output";
import { OrganizationsTeamsMembershipsService } from "@/modules/organizations/services/organizations-teams-memberships.service";
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
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId/memberships",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard)
@DocsTags("Organizations Teams")
export class OrganizationsTeamsMembershipsController {
  constructor(
    private organizationsTeamsMembershipsService: OrganizationsTeamsMembershipsService,
    private readonly organizationsRepository: OrganizationsRepository
  ) {}

  @Get("/")
  @ApiOperation({ summary: "Get all the memberships of a team of an organization." })
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
        plainToClass(OrgTeamMembershipOutputDto, membership, { strategy: "excludeAll" })
      ),
    };
  }

  @Get("/:membershipId")
  @ApiOperation({ summary: "Get the membership of an organization's team by ID" })
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
      data: plainToClass(OrgTeamMembershipOutputDto, orgTeamMembership, { strategy: "excludeAll" }),
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Delete("/:membershipId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete the membership of an organization's team by ID" })
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
      data: plainToClass(OrgTeamMembershipOutputDto, membership, { strategy: "excludeAll" }),
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Patch("/:membershipId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update the membership of an organization's team by ID" })
  async updateOrgTeamMembership(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("membershipId", ParseIntPipe) membershipId: number,
    @Body() data: UpdateOrgTeamMembershipDto
  ): Promise<OrgTeamMembershipOutputResponseDto> {
    const membership = await this.organizationsTeamsMembershipsService.updateOrgTeamMembership(
      orgId,
      teamId,
      membershipId,
      data
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgTeamMembershipOutputDto, membership, { strategy: "excludeAll" }),
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a membership of an organization's team" })
  async createOrgTeamMembership(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() data: CreateOrgTeamMembershipDto
  ): Promise<OrgTeamMembershipOutputResponseDto> {
    const user = await this.organizationsRepository.findOrgUser(Number(orgId), Number(data.userId));

    if (!user) {
      throw new UnprocessableEntityException("User is not part of the Organization");
    }

    const membership = await this.organizationsTeamsMembershipsService.createOrgTeamMembership(teamId, data);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgTeamMembershipOutputDto, membership, { strategy: "excludeAll" }),
    };
  }
}
