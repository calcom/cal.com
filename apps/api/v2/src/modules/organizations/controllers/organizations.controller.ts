import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { NextAuthGuard } from "@/modules/auth/guards/next-auth/next-auth.guard";
import { OrganizationRolesGuard } from "@/modules/auth/guards/organization-roles/organization-roles.guard";
import { OrganizationIdGuard } from "@/modules/auth/guards/organization/organization-id.guard";
import { OrganizationUsersRepository } from "@/modules/organizations/repositories/organization-users.repository";
import { OrganizationsService } from "@/modules/organizations/services/organizations.service";
import { Controller, Get, Post, Patch, Param, Logger, UseGuards, Body } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import {
  ApiResponse,
  GetOrganizationUsersInput_2024_06_18,
  GetOrganizationUsersOutput_2024_06_18,
  GetOrganizationUserOutput_2024_06_18,
  UpdateOrganizationUserInput_2024_06_18,
} from "@calcom/platform-types";

@Controller({
  path: "v2/organizations",
  version: API_VERSIONS_VALUES,
})
export class OrganizationsController {
  private logger = new Logger("Organization Controller");

  constructor(
    private readonly organizationUsersRepository: OrganizationUsersRepository,
    private readonly organizationsService: OrganizationsService
  ) {}

  @Get("/:organizationId/users")
  // @UseGuards(NextAuthGuard, OrganizationRolesGuard, OrganizationIdGuard)
  // @Roles(["OWNER", "ADMIN"])
  async getOrganizationUsers(
    @Param("organizationId") organizationId: number,
    @Body() input: GetOrganizationUsersInput_2024_06_18
  ): Promise<ApiResponse<GetOrganizationUsersOutput_2024_06_18>> {
    const users = await this.organizationsService.getOrganizationUsers(organizationId, input.email);

    return {
      status: "success",
      data: { users },
    };
  }

  @Patch("/:organizationId/users/:userId")
  @UseGuards(NextAuthGuard, OrganizationRolesGuard, OrganizationIdGuard)
  @Roles(["OWNER", "ADMIN"])
  async updateOrganizationUser(
    @Param("organizationId") organizationId: number,
    @Param("userId") userId: number,
    @Body() input: UpdateOrganizationUserInput_2024_06_18
  ): Promise<ApiResponse<GetOrganizationUserOutput_2024_06_18>> {
    const users = await this.organizationsService.getOrganizationUsers(organizationId);
    return {
      status: "success",
      data: users[0],
    };
  }
}
