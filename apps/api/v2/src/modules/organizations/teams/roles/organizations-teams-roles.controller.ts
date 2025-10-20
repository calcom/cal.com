import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  OPTIONAL_API_KEY_HEADER,
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
} from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Pbac } from "@/modules/auth/decorators/pbac/pbac.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { PbacGuard } from "@/modules/auth/guards/pbac/pbac.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { CreateTeamRoleInput } from "@/modules/organizations/teams/roles/inputs/create-team-role.input";
import { UpdateTeamRoleInput } from "@/modules/organizations/teams/roles/inputs/update-team-role.input";
import { CreateTeamRoleOutput } from "@/modules/organizations/teams/roles/outputs/create-team-role.output";
import { DeleteTeamRoleOutput } from "@/modules/organizations/teams/roles/outputs/delete-team-role.output";
import { GetAllTeamRolesOutput } from "@/modules/organizations/teams/roles/outputs/get-all-team-roles.output";
import { GetTeamRoleOutput } from "@/modules/organizations/teams/roles/outputs/get-team-role.output";
import { UpdateTeamRoleOutput } from "@/modules/organizations/teams/roles/outputs/update-team-role.output";
import { TeamRolesOutputService } from "@/modules/organizations/teams/roles/services/team-roles-output.service";
import { RolesService } from "@/modules/roles/services/roles.service";
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
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId/roles",
  version: API_VERSIONS_VALUES,
})
@UseGuards(
  ApiAuthGuard,
  IsOrgGuard,
  PbacGuard,
  RolesGuard,
  IsTeamInOrg,
  PlatformPlanGuard,
  IsAdminAPIEnabledGuard
)
@DocsTags("Orgs / Teams / Roles")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsTeamsRolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly rolesOutputService: TeamRolesOutputService
  ) {}

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.create"])
  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new organization team role" })
  async createRole(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() body: CreateTeamRoleInput
  ): Promise<CreateTeamRoleOutput> {
    const role = await this.rolesService.createRole(teamId, body);
    return {
      status: SUCCESS_STATUS,
      data: this.rolesOutputService.getTeamRoleOutput(role),
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.read"])
  @Get("/:roleId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a specific organization team role" })
  async getRole(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("roleId") roleId: string
  ): Promise<GetTeamRoleOutput> {
    const role = await this.rolesService.getRole(teamId, roleId);
    return {
      status: SUCCESS_STATUS,
      data: this.rolesOutputService.getTeamRoleOutput(role),
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.read"])
  @Get("/")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all organization team roles" })
  async getAllRoles(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<GetAllTeamRolesOutput> {
    const { skip, take } = queryParams;
    const roles = await this.rolesService.getTeamRoles(teamId, skip ?? 0, take ?? 250);
    return {
      status: SUCCESS_STATUS,
      data: this.rolesOutputService.getTeamRolesOutput(roles),
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.update"])
  @Patch("/:roleId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update an organization team role" })
  async updateRole(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("roleId") roleId: string,
    @Body() body: UpdateTeamRoleInput
  ): Promise<UpdateTeamRoleOutput> {
    const role = await this.rolesService.updateRole(teamId, roleId, body);
    return {
      status: SUCCESS_STATUS,
      data: this.rolesOutputService.getTeamRoleOutput(role),
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.delete"])
  @Delete("/:roleId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete an organization team role" })
  async deleteRole(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("roleId") roleId: string
  ): Promise<DeleteTeamRoleOutput> {
    const role = await this.rolesService.deleteRole(teamId, roleId);
    return {
      status: SUCCESS_STATUS,
      data: this.rolesOutputService.getTeamRoleOutput(role),
    };
  }
}
