import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { NextAuthGuard } from "@/modules/auth/guards/next-auth/next-auth.guard";
import { OrganizationRolesGuard } from "@/modules/auth/guards/organization-roles/organization-roles.guard";
import { OrganizationIdGuard } from "@/modules/auth/guards/organization/organization-id.guard";
import { GetUsersInput } from "@/modules/organizations/controllers/inputs/get-users-input.dto";
import { ListUsersResponseDto } from "@/modules/organizations/controllers/outputs/listUsersResponse.dto";
import { OrganizationUsersRepository } from "@/modules/organizations/repositories/organizationUsers.repository";
import { Controller, Get, Post, Param, Logger, UseGuards, Body } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "/organizations",
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
    @Body() input: GetUsersInput
  ): Promise<ApiResponse<ListUsersResponseDto>> {
    console.log("🚀 ~ OrganizationsController ~ input:", input);

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
}
