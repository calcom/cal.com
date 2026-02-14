import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { CreateInviteOutputDto } from "@/modules/teams/invite/outputs/invite.output";

import { Controller, UseGuards, Post, Param, ParseIntPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { TeamService } from "@calcom/platform-libraries";

@Controller({
  path: "/v2/teams/:teamId",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, RolesGuard)
@DocsTags("Teams / Invite")
@ApiHeader(API_KEY_HEADER)
export class TeamsInviteController {
  @Post("/invite")
  @Roles("TEAM_ADMIN")
  @ApiOperation({ summary: "Create team invite link" })
  @HttpCode(HttpStatus.OK)
  async createInvite(@Param("teamId", ParseIntPipe) teamId: number): Promise<CreateInviteOutputDto> {
    const result = await TeamService.createInvite(teamId);
    return { status: SUCCESS_STATUS, data: result };
  }
}
