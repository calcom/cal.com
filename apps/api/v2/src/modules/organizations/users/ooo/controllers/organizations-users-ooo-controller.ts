import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  OPTIONAL_API_KEY_HEADER,
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
} from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsUserInOrg } from "@/modules/auth/guards/users/is-user-in-org.guard";
import { IsUserOOO } from "@/modules/ooo/guards/is-user-ooo";
import {
  CreateOutOfOfficeEntryDto,
  UpdateOutOfOfficeEntryDto,
  GetOutOfOfficeEntryFiltersDTO,
  GetOrgUsersOutOfOfficeEntryFiltersDTO,
} from "@/modules/ooo/inputs/ooo.input";
import {
  UserOooOutputDto,
  UserOooOutputResponseDto,
  UserOoosOutputResponseDto,
} from "@/modules/ooo/outputs/ooo.output";
import { UserOOOService } from "@/modules/ooo/services/ooo.service";
import { OrgUsersOOOService } from "@/modules/organizations/users/ooo/services/organization-users-ooo.service";
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

@Controller({
  path: "/v2/organizations/:orgId",
  version: API_VERSIONS_VALUES,
})
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@UseGuards(IsOrgGuard)
@DocsTags("Orgs / Users / OOO")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsUsersOOOController {
  constructor(
    private readonly userOOOService: UserOOOService,
    private readonly orgUsersOOOService: OrgUsersOOOService
  ) {}

  @Get("/users/:userId/ooo")
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrg)
  @ApiOperation({ summary: "Get all out-of-office entries for a user" })
  async getOrganizationUserOOO(
    @Param("userId", ParseIntPipe) userId: number,
    @Query() query: GetOutOfOfficeEntryFiltersDTO
  ): Promise<UserOoosOutputResponseDto> {
    const { skip, take, ...rest } = query ?? { skip: 0, take: 250 };
    const ooos = await this.userOOOService.getUserOOOPaginated(userId, skip ?? 0, take ?? 250, rest);

    return {
      status: SUCCESS_STATUS,
      data: ooos.map((ooo) => plainToInstance(UserOooOutputDto, ooo, { strategy: "excludeAll" })),
    };
  }

  @Post("/users/:userId/ooo")
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrg)
  @ApiOperation({ summary: "Create an out-of-office entry for a user" })
  async createOrganizationUserOOO(
    @Param("userId", ParseIntPipe) userId: number,
    @Body() input: CreateOutOfOfficeEntryDto
  ): Promise<UserOooOutputResponseDto> {
    const ooo = await this.userOOOService.createUserOOO(userId, input);
    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(UserOooOutputDto, ooo, { strategy: "excludeAll" }),
    };
  }

  @Patch("/users/:userId/ooo/:oooId")
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrg, IsUserOOO)
  @ApiOperation({ summary: "Update an out-of-office entry for a user" })
  async updateOrganizationUserOOO(
    @Param("userId", ParseIntPipe) userId: number,
    @Param("oooId", ParseIntPipe) oooId: number,

    @Body() input: UpdateOutOfOfficeEntryDto
  ): Promise<UserOooOutputResponseDto> {
    const ooo = await this.userOOOService.updateUserOOO(userId, oooId, input);
    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(UserOooOutputDto, ooo, { strategy: "excludeAll" }),
    };
  }

  @Delete("/users/:userId/ooo/:oooId")
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrg, IsUserOOO)
  @ApiOperation({ summary: "Delete an out-of-office entry for a user" })
  async deleteOrganizationUserOOO(
    @Param("oooId", ParseIntPipe) oooId: number
  ): Promise<UserOooOutputResponseDto> {
    const ooo = await this.userOOOService.deleteUserOOO(oooId);
    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(UserOooOutputDto, ooo, { strategy: "excludeAll" }),
    };
  }

  @Get("/ooo")
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @ApiOperation({ summary: "Get all out-of-office entries for organization users" })
  async getOrganizationUsersOOO(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Query() query: GetOrgUsersOutOfOfficeEntryFiltersDTO
  ): Promise<UserOoosOutputResponseDto> {
    const { skip, take, email, ...rest } = query ?? { skip: 0, take: 250 };
    const ooos = await this.orgUsersOOOService.getOrgUsersOOOPaginated(orgId, skip ?? 0, take ?? 250, rest, {
      email,
    });

    return {
      status: SUCCESS_STATUS,
      data: ooos.map((ooo) => plainToInstance(UserOooOutputDto, ooo, { strategy: "excludeAll" })),
    };
  }
}
