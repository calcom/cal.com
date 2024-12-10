import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { OrganizationsEventTypesService } from "@/modules/organizations/services/event-types/organizations-event-types.service";
import { CreateTeamMembershipInput } from "@/modules/teams/memberships/inputs/create-team-membership.input";
import { UpdateTeamMembershipInput } from "@/modules/teams/memberships/inputs/update-team-membership.input";
import { CreateTeamMembershipOutput } from "@/modules/teams/memberships/outputs/create-team-membership.output";
import { DeleteTeamMembershipOutput } from "@/modules/teams/memberships/outputs/delete-team-membership.output";
import { GetTeamMembershipOutput } from "@/modules/teams/memberships/outputs/get-team-membership.output";
import { GetTeamMembershipsOutput } from "@/modules/teams/memberships/outputs/get-team-memberships.output";
import { TeamMembershipOutput } from "@/modules/teams/memberships/outputs/team-membership.output";
import { UpdateTeamMembershipOutput } from "@/modules/teams/memberships/outputs/update-team-membership.output";
import { TeamsMembershipsService } from "@/modules/teams/memberships/services/teams-memberships.service";
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
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { updateNewTeamMemberEventTypes } from "@calcom/platform-libraries";
import { SkipTakePagination } from "@calcom/platform-types";

@Controller({
  path: "/v2/teams/:teamId/memberships",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, RolesGuard)
@DocsTags("Teams / Memberships")
export class TeamsMembershipsController {
  private logger = new Logger("TeamsMembershipsController");

  constructor(
    private teamsMembershipsService: TeamsMembershipsService,
    private oganizationsEventTypesService: OrganizationsEventTypesService
  ) {}

  @Roles("TEAM_ADMIN")
  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a membership" })
  async createTeamMembership(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() body: CreateTeamMembershipInput
  ): Promise<CreateTeamMembershipOutput> {
    const membership = await this.teamsMembershipsService.createTeamMembership(teamId, body);
    if (membership.accepted) {
      try {
        await updateNewTeamMemberEventTypes(body.userId, teamId);
      } catch (err) {
        this.logger.error("Could not update new team member eventTypes", err);
      }
    }
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamMembershipOutput, membership, { strategy: "excludeAll" }),
    };
  }

  @Get("/:membershipId")
  @ApiOperation({ summary: "Get a membership" })
  @Roles("TEAM_ADMIN")
  @HttpCode(HttpStatus.OK)
  async getTeamMembership(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("membershipId", ParseIntPipe) membershipId: number
  ): Promise<GetTeamMembershipOutput> {
    const orgTeamMembership = await this.teamsMembershipsService.getTeamMembership(teamId, membershipId);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamMembershipOutput, orgTeamMembership, { strategy: "excludeAll" }),
    };
  }

  @Get("/")
  @ApiOperation({ summary: "Get all memberships" })
  @Roles("TEAM_ADMIN")
  @HttpCode(HttpStatus.OK)
  async getTeamMemberships(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<GetTeamMembershipsOutput> {
    const { skip, take } = queryParams;
    const orgTeamMemberships = await this.teamsMembershipsService.getPaginatedTeamMemberships(
      teamId,
      skip ?? 0,
      take ?? 250
    );
    return {
      status: SUCCESS_STATUS,
      data: orgTeamMemberships.map((membership) =>
        plainToClass(TeamMembershipOutput, membership, { strategy: "excludeAll" })
      ),
    };
  }

  @Roles("TEAM_ADMIN")
  @Patch("/:membershipId")
  @ApiOperation({ summary: "Create a membership" })
  async updateTeamMembership(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("membershipId", ParseIntPipe) membershipId: number,
    @Body() body: UpdateTeamMembershipInput
  ): Promise<UpdateTeamMembershipOutput> {
    const membership = await this.teamsMembershipsService.updateTeamMembership(teamId, membershipId, body);

    const currentMembership = await this.teamsMembershipsService.getTeamMembership(teamId, membershipId);

    const updatedMembership = await this.teamsMembershipsService.updateTeamMembership(
      teamId,
      membershipId,
      body
    );

    if (!currentMembership.accepted && updatedMembership.accepted) {
      try {
        await updateNewTeamMemberEventTypes(updatedMembership.userId, teamId);
      } catch (err) {
        this.logger.error("Could not update new team member eventTypes", err);
      }
    }
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamMembershipOutput, membership, { strategy: "excludeAll" }),
    };
  }

  @Roles("TEAM_ADMIN")
  @Delete("/:membershipId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a membership" })
  async deleteTeamMembership(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("membershipId", ParseIntPipe) membershipId: number
  ): Promise<DeleteTeamMembershipOutput> {
    const membership = await this.teamsMembershipsService.deleteTeamMembership(teamId, membershipId);

    await this.oganizationsEventTypesService.deleteUserTeamEventTypesAndHosts(membership.userId, teamId);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamMembershipOutput, membership, { strategy: "excludeAll" }),
    };
  }
}
