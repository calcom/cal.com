import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsUserInOrg } from "@/modules/auth/guards/users/is-user-in-org.guard";
import { IsUserOOO } from "@/modules/ooo/guards/is-user-ooo";
import { CreateOutOfOfficeEntryDto, UpdateOutOfOfficeEntryDto } from "@/modules/ooo/inputs/ooo.input";
import {
  UserOooOutputDto,
  UserOooOutputResponseDto,
  UserOoosOutputResponseDto,
} from "@/modules/ooo/outputs/ooo.output";
import { UserOOOService } from "@/modules/ooo/services/ooo.service";
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
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";

@Controller({
  path: "/v2/organizations/:orgId/users/:userId/ooo",
  version: API_VERSIONS_VALUES,
})
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@UseGuards(IsOrgGuard)
@DocsTags("Orgs / Users / OOO")
export class OrganizationsUsersOOOController {
  constructor(private readonly userOOOService: UserOOOService) {}

  @Get()
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrg)
  @ApiOperation({ summary: "Get all ooo entries of a user" })
  async getOrganizationUserOOO(
    @Param("userId", ParseIntPipe) userId: number,
    @Query() query: SkipTakePagination
  ): Promise<UserOoosOutputResponseDto> {
    const ooos = await this.userOOOService.getUserOOOPaginated(userId, query.skip ?? 0, query.take ?? 250);

    return {
      status: SUCCESS_STATUS,
      data: ooos.map((ooo) => plainToInstance(UserOooOutputDto, ooo, { strategy: "excludeAll" })),
    };
  }

  @Post()
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrg)
  @ApiOperation({ summary: "Create an ooo entry for user" })
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

  @Patch("/:oooId")
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrg, IsUserOOO)
  @ApiOperation({ summary: "Update ooo entry of a user" })
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

  @Delete("/:oooId")
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrg, IsUserOOO)
  @ApiOperation({ summary: "Delete ooo entry of a user" })
  async deleteOrganizationUserOOO(
    @Param("oooId", ParseIntPipe) oooId: number
  ): Promise<UserOooOutputResponseDto> {
    const ooo = await this.userOOOService.deleteUserOOO(oooId);
    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(UserOooOutputDto, ooo, { strategy: "excludeAll" }),
    };
  }
}
