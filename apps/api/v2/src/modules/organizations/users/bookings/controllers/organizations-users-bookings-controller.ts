import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsUserInOrg } from "@/modules/auth/guards/users/is-user-in-org.guard";
import { OrganizationUsersBookingsService } from "@/modules/organizations/users/bookings/services/organization-users-bookings.service";
import { Controller, UseGuards, Get, Query, ParseIntPipe, Param } from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { GetBookingsInput_2024_08_13, GetBookingsOutput_2024_08_13 } from "@calcom/platform-types";
import { User } from "@calcom/prisma/client";

@Controller({
  path: "/v2/organizations/:orgId/users/:userId/bookings",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsUserInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Users / Bookings")
export class OrganizationsUsersBookingsController {
  constructor(private readonly organizationUsersBookingsService: OrganizationUsersBookingsService) {}

  @Get("/")
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @ApiOperation({ summary: "Get all bookings of an organization user" })
  async getOrganizationUserBookings(
    @GetUser() user: User,
    @Param("orgId", ParseIntPipe) orgId: number,
    @Query() query: GetBookingsInput_2024_08_13
  ): Promise<GetBookingsOutput_2024_08_13> {
    const bookings = await this.organizationUsersBookingsService.getOrganizationUserBookings(
      orgId,
      user,
      query
    );

    return {
      status: SUCCESS_STATUS,
      data: bookings,
    };
  }
}
