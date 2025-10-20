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
import { CreateTeamRolePermissionsInput } from "@/modules/organizations/teams/roles/permissions/inputs/create-team-role-permissions.input";
import { DeleteTeamRolePermissionsQuery } from "@/modules/organizations/teams/roles/permissions/inputs/delete-team-role-permissions.query";
import { GetTeamRolePermissionsOutput } from "@/modules/organizations/teams/roles/permissions/outputs/get-team-role-permissions.output";
import { RolesPermissionsService } from "@/modules/roles/permissions/services/roles-permissions.service";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Put,
  Query,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { PermissionString } from "@calcom/platform-libraries/pbac";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId/roles/:roleId/permissions",
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
@DocsTags("Orgs / Teams / Roles / Permissions")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsTeamsRolesPermissionsController {
  constructor(private readonly rolePermissionsService: RolesPermissionsService) {}

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.update"])
  @Post("/")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Add permissions to an organization team role (single or batch)" })
  async addPermissions(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("roleId") roleId: string,
    @Body() body: CreateTeamRolePermissionsInput
  ): Promise<GetTeamRolePermissionsOutput> {
    const permissions = await this.rolePermissionsService.addRolePermissions(
      teamId,
      roleId,
      body.permissions
    );
    return { status: SUCCESS_STATUS, data: permissions };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.read"])
  @Get("/")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List permissions for an organization team role" })
  async listPermissions(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("roleId") roleId: string
  ): Promise<GetTeamRolePermissionsOutput> {
    const permissions = await this.rolePermissionsService.getRolePermissions(teamId, roleId);
    return { status: SUCCESS_STATUS, data: permissions };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.update"])
  @Put("/")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Replace all permissions for an organization team role" })
  async setPermissions(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("roleId") roleId: string,
    @Body() body: CreateTeamRolePermissionsInput
  ): Promise<GetTeamRolePermissionsOutput> {
    const permissions = await this.rolePermissionsService.setRolePermissions(
      teamId,
      roleId,
      body.permissions || []
    );
    return { status: SUCCESS_STATUS, data: permissions };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.update"])
  @Delete("/:permission")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a permission from an organization team role" })
  async removePermission(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("roleId") roleId: string,
    @Param("permission") permission: PermissionString
  ): Promise<void> {
    await this.rolePermissionsService.removeRolePermission(teamId, roleId, permission);
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.update"])
  @Delete("/")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove multiple permissions from an organization team role" })
  async removePermissions(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("roleId") roleId: string,
    @Query() query: DeleteTeamRolePermissionsQuery
  ): Promise<void> {
    await this.rolePermissionsService.removeRolePermissions(teamId, roleId, query.permissions || []);
  }
}
