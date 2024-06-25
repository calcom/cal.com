import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetOrg } from "@/modules/auth/decorators/get-org/get-org.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { OrganizationsUsersRepository } from "@/modules/organizations/repositories/organizations-users.repository";
import { OrganizationsUsersService } from "@/modules/organizations/services/organizations-users-service";
import { Controller, UseGuards, Get, Param, ParseIntPipe, Body } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  ApiResponse,
  GetOrganizationUsersOutput_2024_06_18,
  GetOrganizationsUsersInput_2024_06_18,
} from "@calcom/platform-types";
import { Team } from "@calcom/prisma/client";

@Controller({
  path: "/v2/organizations/:orgId/users",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard)
@DocsTags("Organizations Users")
export class OrganizationsUsersController {
  constructor(
    private readonly organizationsUsersRepository: OrganizationsUsersRepository,
    private readonly organizationsUsersService: OrganizationsUsersService
  ) {}

  @Get()
  async getOrganizationsUsers(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Body() input: GetOrganizationsUsersInput_2024_06_18
  ): Promise<ApiResponse<GetOrganizationUsersOutput_2024_06_18>> {
    const users = await this.organizationsUsersService.getOrganizationUsers(orgId, input.email);

    return {
      status: "success",
      data: { users },
    };
  }
}
