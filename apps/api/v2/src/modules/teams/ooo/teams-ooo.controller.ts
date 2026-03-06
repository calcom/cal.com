import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsUserInTeam } from "@/modules/auth/guards/users/is-user-in-team.guard";
import { IsUserOOO } from "@/modules/ooo/guards/is-user-ooo";
import {
  CreateOutOfOfficeEntryDto,
  GetOutOfOfficeEntryFiltersDTO,
  UpdateOutOfOfficeEntryDto,
} from "@/modules/ooo/inputs/ooo.input";
import {
  UserOooOutputDto,
  UserOooOutputResponseDto,
  UserOoosOutputResponseDto,
} from "@/modules/ooo/outputs/ooo.output";
import { UserOOOService } from "@/modules/ooo/services/ooo.service";

@Controller({
  path: "/v2/teams/:teamId/users/:userId/ooo",
  version: API_VERSIONS_VALUES,
})
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(ApiAuthGuard, RolesGuard)
@DocsTags("Teams / Users / OOO")
@ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
export class TeamsOOOController {
  constructor(private readonly userOOOService: UserOOOService) {}

  @Get("/")
  @Roles("TEAM_ADMIN")
  @UseGuards(IsUserInTeam)
  @ApiOperation({ summary: "Get all out-of-office entries for a team member" })
  async getTeamMemberOOO(
    @Param("teamId", ParseIntPipe) _teamId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Query() query: GetOutOfOfficeEntryFiltersDTO
  ): Promise<UserOoosOutputResponseDto> {
    const { skip, take, ...rest } = query ?? { skip: 0, take: 250 };
    const ooos = await this.userOOOService.getUserOOOPaginated(userId, skip ?? 0, take ?? 250, rest);

    return {
      status: SUCCESS_STATUS,
      data: ooos.map((ooo) => plainToInstance(UserOooOutputDto, ooo, { strategy: "excludeAll" })),
    };
  }

  @Post("/")
  @Roles("TEAM_ADMIN")
  @UseGuards(IsUserInTeam)
  @ApiOperation({ summary: "Create an out-of-office entry for a team member" })
  async createTeamMemberOOO(
    @Param("teamId", ParseIntPipe) _teamId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Body() input: CreateOutOfOfficeEntryDto
  ): Promise<UserOooOutputResponseDto> {
    const ooo = await this.userOOOService.createUserOOO(userId, input);
    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(UserOooOutputDto, ooo, { strategy: "excludeAll" }),
    };
  }

  @Patch("/:oooId")
  @Roles("TEAM_ADMIN")
  @UseGuards(IsUserInTeam, IsUserOOO)
  @ApiOperation({ summary: "Update an out-of-office entry for a team member" })
  async updateTeamMemberOOO(
    @Param("teamId", ParseIntPipe) _teamId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Param("oooId", ParseIntPipe) oooId: number,
    @Body() input: UpdateOutOfOfficeEntryDto
  ): Promise<UserOooOutputResponseDto> {
    const ooo = await this.userOOOService.updateUserOOO(userId, oooId, input);
    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(UserOooOutputDto, ooo, { strategy: "excludeAll" }),
    };
  }

  @Delete("/:oooId")
  @Roles("TEAM_ADMIN")
  @UseGuards(IsUserInTeam, IsUserOOO)
  @ApiOperation({ summary: "Delete an out-of-office entry for a team member" })
  async deleteTeamMemberOOO(
    @Param("teamId", ParseIntPipe) _teamId: number,
    @Param("oooId", ParseIntPipe) oooId: number
  ): Promise<UserOooOutputResponseDto> {
    const ooo = await this.userOOOService.deleteUserOOO(oooId);
    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(UserOooOutputDto, ooo, { strategy: "excludeAll" }),
    };
  }
}
