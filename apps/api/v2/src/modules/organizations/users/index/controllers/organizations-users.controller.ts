import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  OPTIONAL_API_KEY_HEADER,
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
} from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetOrg } from "@/modules/auth/decorators/get-org/get-org.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsUserInOrg } from "@/modules/auth/guards/users/is-user-in-org.guard";
import { CreateOrganizationUserInput } from "@/modules/organizations/users/index/inputs/create-organization-user.input";
import { GetOrganizationsUsersInput } from "@/modules/organizations/users/index/inputs/get-organization-users.input";
import { UpdateOrganizationUserInput } from "@/modules/organizations/users/index/inputs/update-organization-user.input";
import {
  GetOrganizationUsersResponseDTO,
  GetOrgUsersWithProfileOutput,
} from "@/modules/organizations/users/index/outputs/get-organization-users.output";
import { GetOrganizationUserOutput } from "@/modules/organizations/users/index/outputs/get-organization-users.output";
import { OrganizationsUsersService } from "@/modules/organizations/users/index/services/organizations-users-service";
import { UserWithProfile } from "@/modules/users/users.repository";
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
  Query,
} from "@nestjs/common";
import { ClassSerializerInterceptor } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { Team } from "@calcom/prisma/client";

@Controller({
  path: "/v2/organizations/:orgId/users",
  version: API_VERSIONS_VALUES,
})
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@UseGuards(IsOrgGuard)
@DocsTags("Orgs / Users")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsUsersController {
  constructor(private readonly organizationsUsersService: OrganizationsUsersService) {}

  @Get()
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @ApiOperation({ summary: "Get all users" })
  async getOrganizationsUsers(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Query() query: GetOrganizationsUsersInput
  ): Promise<GetOrganizationUsersResponseDTO> {
    const { emails, assignedOptionIds, attributeQueryOperator, teamIds } = query ?? {};
    const users = await this.organizationsUsersService.getUsers(
      orgId,
      emails,
      { assignedOptionIds, attributeQueryOperator, teamIds },
      query.skip ?? 0,
      query.take ?? 250
    );

    return {
      status: SUCCESS_STATUS,
      data: users.map((user) =>
        plainToInstance(
          GetOrgUsersWithProfileOutput,
          { ...user, profile: user?.profiles?.[0] ?? {} },
          { strategy: "excludeAll" }
        )
      ),
    };
  }

  @Post()
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @ApiOperation({ summary: "Create a user" })
  async createOrganizationUser(
    @GetOrg() org: Team,
    @Body() input: CreateOrganizationUserInput,
    @GetUser() inviter: UserWithProfile
  ): Promise<GetOrganizationUserOutput> {
    const user = await this.organizationsUsersService.createUser(
      org,
      input,
      inviter.name ?? inviter.username ?? inviter.email
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(
        GetOrgUsersWithProfileOutput,
        { ...user, profile: user?.profiles?.[0] ?? {} },
        { strategy: "excludeAll" }
      ),
    };
  }

  @Patch("/:userId")
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrg)
  @ApiOperation({ summary: "Update a user" })
  async updateOrganizationUser(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Body() input: UpdateOrganizationUserInput
  ): Promise<GetOrganizationUserOutput> {
    const user = await this.organizationsUsersService.updateUser(orgId, userId, input);
    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(
        GetOrgUsersWithProfileOutput,
        { ...user, profile: user?.profiles?.[0] ?? {} },
        { strategy: "excludeAll" }
      ),
    };
  }

  @Delete("/:userId")
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrg)
  @ApiOperation({ summary: "Delete a user" })
  async deleteOrganizationUser(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("userId", ParseIntPipe) userId: number
  ): Promise<GetOrganizationUserOutput> {
    const user = await this.organizationsUsersService.deleteUser(orgId, userId);
    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(
        GetOrgUsersWithProfileOutput,
        { ...user, profile: user?.profiles?.[0] ?? {} },
        { strategy: "excludeAll" }
      ),
    };
  }
}
