import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { TeamOutputDto } from "@calcom/platform-types";
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { Throttle } from "@/lib/endpoint-throttler-decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { UpdateOrgTeamDto } from "@/modules/organizations/teams/index/inputs/update-organization-team.input";
import { OrgTeamOutputResponseDto } from "@/modules/organizations/teams/index/outputs/organization-team.output";
import { CreateTeamInput } from "@/modules/teams/teams/inputs/create-team.input";
import { CreateTeamOutput } from "@/modules/teams/teams/outputs/teams/create-team.output";
import { GetTeamOutput } from "@/modules/teams/teams/outputs/teams/get-team.output";
import { GetTeamsOutput } from "@/modules/teams/teams/outputs/teams/get-teams.output";
import { UpdateTeamOutput } from "@/modules/teams/teams/outputs/teams/update-team.output";
import { TeamsService } from "@/modules/teams/teams/services/teams.service";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { UserWithProfile } from "@/modules/users/users.repository";

@Controller({
  path: "/v2/teams",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard)
@DocsTags("Teams")
@ApiHeader(API_KEY_HEADER)
export class TeamsController {
  constructor(
    private teamsService: TeamsService,
    private teamsRepository: TeamsRepository
  ) {}

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
      data: teams.map((team) => plainToClass(TeamOutputDto, team, { strategy: "excludeAll" })),
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
  @Throttle({ limit: 1, ttl: 1000, blockDuration: 1000, name: "teams_delete" })
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
