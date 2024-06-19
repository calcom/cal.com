import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { NextAuthGuard } from "@/modules/auth/guards/next-auth/next-auth.guard";
import { OrganizationRolesGuard } from "@/modules/auth/guards/organization-roles/organization-roles.guard";
import { OrganizationIdGuard } from "@/modules/auth/guards/organization/organization-id.guard";
import { ListUsersResponseDto } from "@/modules/organizations/controllers/outputs/listUsersResponse.dto";
import { OrganizationUsersRepository } from "@/modules/organizations/repositories/organization-users.repository";
import { Controller, Get, Post, Patch, Param, Logger, UseGuards, Body } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { ApiResponse, GetOrganizationUsersInput_2024_06_18 } from "@calcom/platform-types";

@Controller({
  path: "v2/organizations",
  version: API_VERSIONS_VALUES,
})
@ApiExcludeController(false)
export class OrganizationsController {
  private logger = new Logger("Organization Controller");

  constructor(private readonly organizationUsersRepository: OrganizationUsersRepository) {}

  @Get("/:organizationId/users")
  // @UseGuards(NextAuthGuard, OrganizationRolesGuard, OrganizationIdGuard)
  @Roles(["OWNER", "ADMIN"])
  async getOrganizationUsers(
    @Param("organizationId") organizationId: number,
    @Body() input: GetOrganizationUsersInput_2024_06_18
  ): Promise<ApiResponse<ListUsersResponseDto>> {
    const emailArray = Array.isArray(input.email) ? input.email : [input.email];

    const users = await this.organizationUsersRepository.getOrganizationUsers(organizationId, emailArray);

    return {
      status: "success",
      data: { users },
    };
  }

  @Post("/:organizationId/users")
  @UseGuards(NextAuthGuard, OrganizationRolesGuard, OrganizationIdGuard)
  @Roles(["OWNER", "ADMIN"])
  async postOrganizationUsers(): Promise<string> {
    return "Please use the organizations membership endpoint to add new users";
  }

  //   @Patch("/:organizationId/users/:userId")
  //   @UseGuards(NextAuthGuard, OrganizationRolesGuard, OrganizationIdGuard)
  //   @Roles(["OWNER", "ADMIN"])
  //   async updateOrganizationUser(): Promise<ApiResponse<UpdateUserResponseDto>> {
  // return;
  //   }
}
