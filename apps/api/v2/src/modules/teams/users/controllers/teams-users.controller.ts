import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { GetOrgUsersWithProfileOutput } from "@/modules/organizations/users/index/outputs/get-organization-users.output";
import { GetTeamUsersInput } from "@/modules/teams/users/inputs/get-team-users.input";
import { GetTeamUsersResponseDTO } from "@/modules/teams/users/outputs/get-team-users.output";
import { TeamsUsersService } from "@/modules/teams/users/services/teams-users.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  Controller,
  UseGuards,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
  ForbiddenException,
} from "@nestjs/common";
import { ClassSerializerInterceptor } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/v2/teams/:teamId/users",
  version: API_VERSIONS_VALUES,
})
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(ApiAuthGuard, RolesGuard)
@DocsTags("Teams / Users")
@ApiHeader(API_KEY_HEADER)
export class TeamsUsersController {
  constructor(private readonly teamsUsersService: TeamsUsersService) {}

  @Get()
  @Roles("TEAM_ADMIN")
  @ApiOperation({ summary: "Get all team users" })
  async getTeamUsers(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() query: GetTeamUsersInput,
    @GetUser() user: UserWithProfile
  ): Promise<GetTeamUsersResponseDTO> {
    // Validate user has access to this team
    try {
      await this.teamsUsersService.validateUserTeamAccess(teamId, user.id);
    } catch {
      throw new ForbiddenException(`You don't have access to team ${teamId}`);
    }

    const { emails } = query ?? {};
    const users = await this.teamsUsersService.getUsers(teamId, emails, query.skip ?? 0, query.take ?? 250);

    return {
      status: SUCCESS_STATUS,
      data: users.map((user) =>
        plainToInstance(
          GetOrgUsersWithProfileOutput,
          { ...user, profile: user?.profiles?.[0] ?? {} },
          { strategy: "excludeAll" }
        )
      ),
    };
  }
}
