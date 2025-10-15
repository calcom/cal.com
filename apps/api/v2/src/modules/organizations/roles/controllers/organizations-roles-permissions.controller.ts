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
import { CreateRolePermissionsInput } from "@/modules/organizations/roles/inputs/create-role-permissions.input";
import { DeleteRolePermissionsQuery } from "@/modules/organizations/roles/inputs/delete-role-permissions.query";
import { GetRolePermissionsOutput } from "@/modules/organizations/roles/outputs/get-role-permissions.output";
import { RolePermissionsService } from "@/modules/organizations/roles/services/role-permissions.service";
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
@UseGuards(ApiAuthGuard, IsOrgGuard, PbacGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Roles / Permissions")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsRolesPermissionsController {
  constructor(private readonly rolePermissionsService: RolePermissionsService) {}

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.read"])
  @Get("/")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List permissions for a role" })
  async listPermissions(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("roleId") roleId: string
  ): Promise<GetRolePermissionsOutput> {
    const permissions = await this.rolePermissionsService.getRolePermissions(teamId, roleId);
    return { status: SUCCESS_STATUS, data: permissions };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.update"])
  @Post("/")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Add permissions to a role (single or batch)" })
  async addPermissions(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("roleId") roleId: string,
    @Body() body: CreateRolePermissionsInput
  ): Promise<GetRolePermissionsOutput> {
    const permissions = await this.rolePermissionsService.addRolePermissions(
      teamId,
      roleId,
      body.permissions
    );
    return { status: SUCCESS_STATUS, data: permissions };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.update"])
  @Delete("/:permission")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a permission from a role" })
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
  @ApiOperation({ summary: "Remove multiple permissions from a role" })
  async removePermissions(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("roleId") roleId: string,
    @Query() query: DeleteRolePermissionsQuery
  ): Promise<void> {
    await this.rolePermissionsService.removeRolePermissions(teamId, roleId, query.permissions || []);
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.update"])
  @Put("/")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Replace all permissions for a role" })
  async setPermissions(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("roleId") roleId: string,
    @Body() body: CreateRolePermissionsInput
  ): Promise<GetRolePermissionsOutput> {
    const permissions = await this.rolePermissionsService.setRolePermissions(
      teamId,
      roleId,
      body.permissions || []
    );
    return { status: SUCCESS_STATUS, data: permissions };
  }
}
