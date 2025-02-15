import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { CreateDwdOutput } from "@/modules/organizations/dwd/outputs/create-dwd.output";
import { DwdOutput } from "@/modules/organizations/dwd/outputs/dwd.output";
import { Controller, UseGuards, Param, ParseIntPipe, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { User } from "@prisma/client";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { addDwd } from "@calcom/platform-libraries";

import { CreateDwdInput } from "./inputs/create-dwd.input";

@Controller({
  path: "/v2/organizations/:orgId/dwd",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / dwd")
export class OrganizationsDwdController {
  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @ApiOperation({ summary: "Create a dwd" })
  async createDwd(
    @Param("orgId", ParseIntPipe) orgId: number,
    @GetUser() user: User,
    @Body() body: CreateDwdInput
  ): Promise<CreateDwdOutput> {
    const dwd = await addDwd({ input: body, ctx: { user: { id: user.id, organizationId: orgId } } });
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(DwdOutput, dwd, { strategy: "excludeAll" }),
    };
  }
}
