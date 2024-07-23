import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetTeam } from "@/modules/auth/decorators/get-team/get-team.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { CreateOrgTeamDto } from "@/modules/organizations/inputs/create-organization-team.input";
import {
  OrgTeamOutputDto,
  OrgTeamOutputResponseDto,
  OrgTeamsOutputResponseDto,
} from "@/modules/organizations/outputs/organization-team.output";
import { OrganizationsTeamsService } from "@/modules/organizations/services/organizations-teams.service";
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
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";
import { Team } from "@calcom/prisma/client";

@Controller({
  path: "/v2/organizations/:orgId/teams",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard)
@DocsTags("Organizations Teams")
export class OrganizationsTeamsController {
  constructor(private organizationsTeamsService: OrganizationsTeamsService) {}

  @Get()
  @ApiOperation({ summary: "Get all the teams of an organization." })
  @UseGuards()
  @Roles("ORG_ADMIN")
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

  @UseGuards(IsTeamInOrg)
  @Roles("TEAM_ADMIN")
  @Get("/:teamId")
  @ApiOperation({ summary: "Get a team of the organization by ID." })
  async getTeam(@GetTeam() team: Team): Promise<OrgTeamOutputResponseDto> {
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgTeamOutputDto, team, { strategy: "excludeAll" }),
    };
  }

  @UseGuards(IsTeamInOrg)
  @Roles("ORG_ADMIN")
  @Delete("/:teamId")
  @ApiOperation({ summary: "Delete a team of the organization by ID." })
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
  @Patch("/:teamId")
  @ApiOperation({ summary: "Update a team of the organization by ID." })
  async updateTeam(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() body: CreateOrgTeamDto
  ): Promise<OrgTeamOutputResponseDto> {
    const team = await this.organizationsTeamsService.updateOrgTeam(orgId, teamId, body);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgTeamOutputDto, team, { strategy: "excludeAll" }),
    };
  }

  @Post()
  @Roles("ORG_ADMIN")
  @ApiOperation({ summary: "Create a team for an organization." })
  async createTeam(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Body() body: CreateOrgTeamDto,
    @GetUser() user: UserWithProfile
  ): Promise<OrgTeamOutputResponseDto> {
    const team = await this.organizationsTeamsService.createOrgTeam(orgId, body, user);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgTeamOutputDto, team, { strategy: "excludeAll" }),
    };
  }
}
