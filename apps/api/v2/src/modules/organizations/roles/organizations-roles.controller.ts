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
import { CreateOrgRoleInput } from "@/modules/organizations/roles/inputs/create-org-role.input";
import { UpdateOrgRoleInput } from "@/modules/organizations/roles/inputs/update-org-role.input";
import { CreateOrgRoleOutput } from "@/modules/organizations/roles/outputs/create-org-role.output";
import { DeleteOrgRoleOutput } from "@/modules/organizations/roles/outputs/delete-org-role.output";
import { GetAllOrgRolesOutput } from "@/modules/organizations/roles/outputs/get-all-org-roles.output";
import { GetOrgRoleOutput } from "@/modules/organizations/roles/outputs/get-org-role.output";
import { UpdateOrgRoleOutput } from "@/modules/organizations/roles/outputs/update-org-role.output";
import { OrganizationsRolesOutputService } from "@/modules/organizations/roles/services/organizations-roles-output.service";
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
  path: "/v2/organizations/:orgId/roles",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, PbacGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Roles")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsRolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly rolesOutputService: OrganizationsRolesOutputService
  ) {}

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.create"])
  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new organization role" })
  async createRole(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Body() body: CreateOrgRoleInput
  ): Promise<CreateOrgRoleOutput> {
    const role = await this.rolesService.createRole(orgId, body);
    return {
      status: SUCCESS_STATUS,
      data: this.rolesOutputService.getOrganizationRoleOutput(role),
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.read"])
  @Get("/:roleId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a specific organization role" })
  async getRole(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("roleId") roleId: string
  ): Promise<GetOrgRoleOutput> {
    const role = await this.rolesService.getRole(orgId, roleId);
    return {
      status: SUCCESS_STATUS,
      data: this.rolesOutputService.getOrganizationRoleOutput(role),
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.read"])
  @Get("/")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all organization roles" })
  async getAllRoles(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<GetAllOrgRolesOutput> {
    const { skip, take } = queryParams;
    const roles = await this.rolesService.getTeamRoles(orgId, skip ?? 0, take ?? 250);
    return {
      status: SUCCESS_STATUS,
      data: this.rolesOutputService.getOrganizationRolesOutput(roles),
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.update"])
  @Patch("/:roleId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update an organization role" })
  async updateRole(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("roleId") roleId: string,
    @Body() body: UpdateOrgRoleInput
  ): Promise<UpdateOrgRoleOutput> {
    const role = await this.rolesService.updateRole(orgId, roleId, body);
    return {
      status: SUCCESS_STATUS,
      data: this.rolesOutputService.getOrganizationRoleOutput(role),
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @Pbac(["role.delete"])
  @Delete("/:roleId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete an organization role" })
  async deleteRole(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("roleId") roleId: string
  ): Promise<DeleteOrgRoleOutput> {
    const role = await this.rolesService.deleteRole(orgId, roleId);
    return {
      status: SUCCESS_STATUS,
      data: this.rolesOutputService.getOrganizationRoleOutput(role),
    };
  }
}
