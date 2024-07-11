import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetOrg } from "@/modules/auth/decorators/get-org/get-org.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { CreateOrganizationUserInput } from "@/modules/organizations/inputs/create-organization-user.input";
import { GetOrganizationsUsersInput } from "@/modules/organizations/inputs/get-organization-users.input";
import { UpdateOrganizationUserInput } from "@/modules/organizations/inputs/update-organization-user.input";
import { GetOrganizationUsersOutput } from "@/modules/organizations/outputs/get-organization-users.output";
import { GetOrganizationUserOutput } from "@/modules/organizations/outputs/get-organization-users.output";
import { OrganizationsUsersService } from "@/modules/organizations/services/organizations-users-service";
import {
  Controller,
  UseGuards,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  ParseIntPipe,
  Body,
  UseInterceptors,
} from "@nestjs/common";
import { ClassSerializerInterceptor } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";
import { Team } from "@calcom/prisma/client";

@Controller({
  path: "/v2/organizations/:orgId/users",
  version: API_VERSIONS_VALUES,
})
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard)
@UseGuards(IsOrgGuard)
@DocsTags("Organizations Users")
export class OrganizationsUsersController {
  constructor(private readonly organizationsUsersService: OrganizationsUsersService) {}

  @Get()
  @Roles("ORG_ADMIN")
  async getOrganizationsUsers(
    @Param("orgId", ParseIntPipe) orgId: number,
    @GetOrg() org: Team,
    @Body() input: GetOrganizationsUsersInput
  ): Promise<ApiResponse<GetOrganizationUsersOutput>> {
    const users = await this.organizationsUsersService.getUsers(orgId, input.email);

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
  @Roles("ORG_ADMIN")
  async createOrganizationUser(
    @Param("orgId", ParseIntPipe) orgId: number,
    @GetOrg() org: Team,
    @Body() input: CreateOrganizationUserInput
  ): Promise<ApiResponse<GetOrganizationUserOutput>> {
    const user = await this.organizationsUsersService.createUser(org, input);
    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(GetOrganizationUserOutput, user, { strategy: "excludeAll" }),
    };
  }

  @Patch("/:userId")
  @Roles("ORG_ADMIN")
  async updateOrganizationUser(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @GetOrg() org: Team,
    @Body() input: UpdateOrganizationUserInput
  ): Promise<ApiResponse<GetOrganizationUserOutput>> {
    const user = await this.organizationsUsersService.updateUser(orgId, userId, input);
    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(GetOrganizationUserOutput, user, { strategy: "excludeAll" }),
    };
  }

  @Delete("/:userId")
  @Roles("ORG_ADMIN")
  async deleteOrganizationUser(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @GetOrg() org: Team
  ): Promise<ApiResponse<string>> {
    const user = await this.organizationsUsersService.deleteUser(orgId, userId);
    return {
      status: SUCCESS_STATUS,
      data: `User with id ${userId} successfully deleted`,
    };
  }
}
