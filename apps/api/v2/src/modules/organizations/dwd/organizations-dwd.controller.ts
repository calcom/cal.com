import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { UpdateDwdInput } from "@/modules/organizations/dwd/inputs/update-dwd.input";
import { CreateDwdOutput } from "@/modules/organizations/dwd/outputs/create-dwd.output";
import { DwdOutput } from "@/modules/organizations/dwd/outputs/dwd.output";
import { UpdateDwdOutput } from "@/modules/organizations/dwd/outputs/update-dwd.output";
import { OrganizationsDwdService } from "@/modules/organizations/dwd/services/organizations-dwd.service";
import {
  Controller,
  UseGuards,
  Param,
  ParseIntPipe,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Patch,
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { User } from "@prisma/client";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

import { CreateDwdInput } from "./inputs/create-dwd.input";

@Controller({
  path: "/v2/organizations/:orgId/delegation-credentials",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Delegation Credentials")
export class OrganizationsDwdController {
  constructor(private readonly dwdService: OrganizationsDwdService) {}

  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @ApiOperation({ summary: "Save delegation credentials for your organization." })
  async createDwd(
    @Param("orgId", ParseIntPipe) orgId: number,
    @GetUser() dwdServiceAccountUser: User,
    @Body() body: CreateDwdInput
  ): Promise<CreateDwdOutput> {
    const dwd = await this.dwdService.createDwd(orgId, dwdServiceAccountUser, body);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(DwdOutput, dwd, { strategy: "excludeAll" }),
    };
  }

  @Patch("/:credentialId")
  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @ApiOperation({ summary: "Update delegation credentials of your organization." })
  async updateDwd(
    @Param("orgId", ParseIntPipe) orgId: number,
    @GetUser() dwdServiceAccountUser: User,
    @Body() body: UpdateDwdInput,
    @Param("credentialId") credentialId: string
  ): Promise<UpdateDwdOutput> {
    const dwd = await this.dwdService.updateDwd(orgId, credentialId, dwdServiceAccountUser, body);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(DwdOutput, dwd, { strategy: "excludeAll" }),
    };
  }
}
