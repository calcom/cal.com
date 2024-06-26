import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { OrganizationsUsersService } from "@/modules/organizations/services/organizations-users-service";
import { Controller, UseGuards, Get, Post, Param, ParseIntPipe, Body } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  ApiResponse,
  GetOrganizationUsersOutput_2024_06_18,
  GetOrganizationsUsersInput_2024_06_18,
  CreateOrganizationUser_2024_06_18,
} from "@calcom/platform-types";
import { Team } from "@calcom/prisma/client";

@Controller({
  path: "/v2/organizations/:orgId/users",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard)
@DocsTags("Organizations Users")
export class OrganizationsUsersController {
  constructor(private readonly organizationsUsersService: OrganizationsUsersService) {}

  @Get()
  async getOrganizationsUsers(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Body() input: GetOrganizationsUsersInput_2024_06_18
  ): Promise<ApiResponse<GetOrganizationUsersOutput_2024_06_18>> {
    const users = await this.organizationsUsersService.getOrganizationUsers(orgId, input.email);

    return {
      status: SUCCESS_STATUS,
      data: { users },
    };
  }

  @Post()
  //   TODO add sysadmin guard
  async createOrganizationUser(
    @Param("orgId", ParseIntPipe) orgId: number,
    @GetOrg() organization: Team,
    @Body() input: CreateOrganizationUser_2024_06_18
  ): Promise<ApiResponse<GetOrganizationUserOutput_2024_06_18>> {
    const user = await this.organizationsUsersService.createOrganizationUser(organization, input);
    return user;
  }
}
