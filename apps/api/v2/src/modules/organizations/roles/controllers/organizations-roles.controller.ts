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
import { CreateRoleInput } from "@/modules/organizations/roles/inputs/create-role.input";
import { UpdateRoleInput } from "@/modules/organizations/roles/inputs/update-role.input";
import { CreateRoleOutput } from "@/modules/organizations/roles/outputs/create-role.output";
import { DeleteRoleOutput } from "@/modules/organizations/roles/outputs/delete-role.output";
import { GetAllRolesOutput } from "@/modules/organizations/roles/outputs/get-all-roles.output";
import { GetRoleOutput } from "@/modules/organizations/roles/outputs/get-role.output";
import { UpdateRoleOutput } from "@/modules/organizations/roles/outputs/update-role.output";
import { OrganizationsRolesService } from "@/modules/organizations/roles/services/organizations-roles.service";
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
@UseGuards(ApiAuthGuard, IsOrgGuard, PbacGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Roles")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsRolesController {
  constructor(private readonly organizationsRolesService: OrganizationsRolesService) {}

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.create"])
  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new role" })
  async createRole(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() body: CreateRoleInput
  ): Promise<CreateRoleOutput> {
    const role = await this.organizationsRolesService.createRole(teamId, body);
    return {
      status: SUCCESS_STATUS,
      data: role,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.read"])
  @Get("/:roleId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a specific role" })
  async getRole(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("roleId") roleId: string
  ): Promise<GetRoleOutput> {
    const role = await this.organizationsRolesService.getRole(teamId, roleId);
    return {
      status: SUCCESS_STATUS,
      data: role,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.read"])
  @Get("/")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all roles for an organization" })
  async getAllRoles(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<GetAllRolesOutput> {
    const { skip, take } = queryParams;
    const roles = await this.organizationsRolesService.getTeamRoles(teamId, skip ?? 0, take ?? 250);
    return {
      status: SUCCESS_STATUS,
      data: roles,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.update"])
  @Patch("/:roleId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update a role" })
  async updateRole(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("roleId") roleId: string,
    @Body() body: UpdateRoleInput
  ): Promise<UpdateRoleOutput> {
    const role = await this.organizationsRolesService.updateRole(teamId, roleId, body);
    return {
      status: SUCCESS_STATUS,
      data: role,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.delete"])
  @Delete("/:roleId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a role" })
  async deleteRole(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("roleId") roleId: string
  ): Promise<DeleteRoleOutput> {
    const role = await this.organizationsRolesService.deleteRole(teamId, roleId);
    return {
      status: SUCCESS_STATUS,
      data: role,
    };
  }
}
