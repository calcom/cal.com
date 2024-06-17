import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { ListUsersResponseDto } from "@/modules/organizations/controllers/outputs/listUsersResponse.dto";
import { OrganizationUsersRepository } from "@/modules/organizations/repositories/organizationUsers.repository";
import { Controller, Get, Param, Logger } from "@nestjs/common";
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
  // @UseGuards(NextAuthGuard, OrganizationRolesGuard)
  // @Roles(["OWNER", "ADMIN"])
  async getOrganizationUsers(
    @Param("organizationId") organizationId: number
  ): Promise<ApiResponse<ListUsersResponseDto>> {
    const users = await this.organizationUsersRepository.getOrganizationUsers(organizationId);

    return {
      status: "success",
      data: { users },
    };
  }
}
