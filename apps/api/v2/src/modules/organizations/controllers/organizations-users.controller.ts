import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { CreateOrganizationUserInput } from "@/modules/organizations/inputs/create-organization-user.input";
import { GetOrganizationsUsersInput } from "@/modules/organizations/inputs/get-organization-users.input";
import { GetOrganizationUsersOutput } from "@/modules/organizations/outputs/get-organization-users.output";
import { GetOrganizationUserOutput } from "@/modules/organizations/outputs/get-organization-users.output";
import { OrganizationsUsersService } from "@/modules/organizations/services/organizations-users-service";
import { Controller, UseGuards, Get, Post, Param, ParseIntPipe, Body, UseInterceptors } from "@nestjs/common";
import { ClassSerializerInterceptor } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "/v2/organizations/:orgId/users",
  version: API_VERSIONS_VALUES,
})
@UseInterceptors(ClassSerializerInterceptor)
// @UseGuards(ApiAuthGuard, IsOrgGuard)
@DocsTags("Organizations Users")
export class OrganizationsUsersController {
  constructor(private readonly organizationsUsersService: OrganizationsUsersService) {}

  @Get()
  async getOrganizationsUsers(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Body() input: GetOrganizationsUsersInput
  ): Promise<ApiResponse<GetOrganizationUsersOutput>> {
    const users = await this.organizationsUsersService.getOrganizationUsers(orgId, input.email);

    return {
      status: SUCCESS_STATUS,
      data: {
        users: users.map((user) =>
          plainToInstance(GetOrganizationUserOutput, user, { strategy: "excludeAll" })
        ),
      },
    };
  }

  @Post()
  //   TODO add sysadmin guard
  async createOrganizationUser(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Body() input: CreateOrganizationUserInput
  ): Promise<ApiResponse<GetOrganizationUserOutput>> {
    const user = await this.organizationsUsersService.createOrganizationUser(orgId, input);
    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(GetOrganizationUserOutput, user, { strategy: "excludeAll" }),
    };
  }

  // @Patch("/:userId")
  // async updateOrganizationUser(
  //   @Param("orgId", ParseIntPipe) orgId: number,
  //   @Body() input:
  // )
}
