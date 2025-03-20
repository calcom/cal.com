import { Controller, UseGuards, Get, Param, ParseIntPipe, Delete, Patch, Post, Body } from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { TeamOutputDto } from "@calcom/platform-types";

import { API_VERSIONS_VALUES } from "../../../../lib/api-versions";
import { GetUser } from "../../../auth/decorators/get-user/get-user.decorator";
import { Roles } from "../../../auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "../../../auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "../../../auth/guards/roles/roles.guard";
import { UpdateOrgTeamDto } from "../../../organizations/teams/index/inputs/update-organization-team.input";
import { OrgTeamOutputResponseDto } from "../../../organizations/teams/index/outputs/organization-team.output";
import { CreateTeamInput } from "../../../teams/teams/inputs/create-team.input";
import { CreateTeamOutput } from "../../../teams/teams/outputs/teams/create-team.output";
import { GetTeamOutput } from "../../../teams/teams/outputs/teams/get-team.output";
import { GetTeamsOutput } from "../../../teams/teams/outputs/teams/get-teams.output";
import { UpdateTeamOutput } from "../../../teams/teams/outputs/teams/update-team.output";
import { TeamsService } from "../../../teams/teams/services/teams.service";
import { TeamsRepository } from "../../../teams/teams/teams.repository";
import { UserWithProfile } from "../../../users/users.repository";

@Controller({
  path: "/v2/teams",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard)
@DocsTags("Teams")
export class TeamsController {
  constructor(private teamsService: TeamsService, private teamsRepository: TeamsRepository) {}

  @Post()
  @ApiOperation({ summary: "Create a team" })
  async createTeam(
    @Body() body: CreateTeamInput,
    @GetUser() user: UserWithProfile
  ): Promise<CreateTeamOutput> {
    const team = await this.teamsService.createTeam(body, user.id);

    if ("paymentLink" in team) {
      return {
        status: SUCCESS_STATUS,
        data: {
          pendingTeam: plainToClass(TeamOutputDto, team.pendingTeam, { strategy: "excludeAll" }),
          paymentLink: team.paymentLink,
          message: team.message,
        },
      };
    }

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamOutputDto, team, { strategy: "excludeAll" }),
    };
  }

  @Get("/:teamId")
  @ApiOperation({ summary: "Get a team" })
  @UseGuards(RolesGuard)
  @Roles("TEAM_MEMBER")
  async getTeam(@Param("teamId", ParseIntPipe) teamId: number): Promise<GetTeamOutput> {
    const team = await this.teamsRepository.getById(teamId);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamOutputDto, team, { strategy: "excludeAll" }),
    };
  }

  @Get("/")
  @ApiOperation({ summary: "Get teams" })
  async getTeams(@GetUser("id") userId: number): Promise<GetTeamsOutput> {
    const teams = await this.teamsService.getUserTeams(userId);
    return {
      status: SUCCESS_STATUS,
      data: teams.map((team: any) => plainToClass(TeamOutputDto, team, { strategy: "excludeAll" })),
    };
  }

  @Patch("/:teamId")
  @ApiOperation({ summary: "Update a team" })
  @UseGuards(RolesGuard)
  @Roles("TEAM_OWNER")
  async updateTeam(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() body: UpdateOrgTeamDto
  ): Promise<UpdateTeamOutput> {
    const team = await this.teamsService.updateTeam(teamId, body);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamOutputDto, team, { strategy: "excludeAll" }),
    };
  }

  @UseGuards(RolesGuard)
  @Delete("/:teamId")
  @ApiOperation({ summary: "Delete a team" })
  @Roles("TEAM_OWNER")
  async deleteTeam(@Param("teamId", ParseIntPipe) teamId: number): Promise<OrgTeamOutputResponseDto> {
    const team = await this.teamsRepository.delete(teamId);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamOutputDto, team, { strategy: "excludeAll" }),
    };
  }
}
