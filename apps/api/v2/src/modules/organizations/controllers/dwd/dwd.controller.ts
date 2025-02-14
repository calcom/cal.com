import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsMembershipInOrg } from "@/modules/auth/guards/memberships/is-membership-in-org.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { CreateOrgMembershipDto } from "@/modules/organizations/inputs/create-organization-membership.input";
import { UpdateOrgMembershipDto } from "@/modules/organizations/inputs/update-organization-membership.input";
import { CreateOrgMembershipOutput } from "@/modules/organizations/outputs/organization-membership/create-membership.output";
import { DeleteOrgMembership } from "@/modules/organizations/outputs/organization-membership/delete-membership.output";
import { GetAllOrgMemberships } from "@/modules/organizations/outputs/organization-membership/get-all-memberships.output";
import { GetOrgMembership } from "@/modules/organizations/outputs/organization-membership/get-membership.output";
import { OrgMembershipOutputDto } from "@/modules/organizations/outputs/organization-membership/membership.output";
import { UpdateOrgMembership } from "@/modules/organizations/outputs/organization-membership/update-membership.output";
import { OrganizationsMembershipService } from "@/modules/organizations/services/organizations-membership.service";
import {
  Controller,
  UseGuards,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Delete,
  Patch,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { User } from "@prisma/client";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { addDwd } from "@calcom/platform-libraries";

@Controller({
  path: "/v2/organizations/:orgId/dwd",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / dwd")
export class OrganizationsDWDController {
  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @ApiOperation({ summary: "Create a dwd" })
  async createDwd(
    @Param("orgId", ParseIntPipe) orgId: number,
    @GetUser() user: User,
    @Body()
    body: {
      workspacePlatformSlug: string;
      domain: string;
      serviceAccountKey: {
        private_key: string;
        client_email: string;
        client_id: string;
      };
    }
  ): Promise<string> {
    console.log(
      "BODY",
      body?.domain,
      body?.workspacePlatformSlug,
      typeof body?.serviceAccountKey,
      typeof body?.serviceAccountKey
    );
    const res = await addDwd({ input: body, ctx: { user: { id: user.id, organizationId: orgId } } });
    console.log("ADDED DWD", res);
    return "success";
  }
}
