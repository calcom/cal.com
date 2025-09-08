import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
  OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER,
} from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsUserInOrg } from "@/modules/auth/guards/users/is-user-in-org.guard";
import { OrganizationUsersBookingsService } from "@/modules/organizations/users/bookings/services/organization-users-bookings.service";
import { Controller, UseGuards, Get, Query, ParseIntPipe, Param } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { GetBookingsInput_2024_08_13, GetBookingsOutput_2024_08_13 } from "@calcom/platform-types";

@Controller({
  path: "/v2/organizations/:orgId/users/:userId/bookings",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsUserInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Users / Bookings")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER)
export class OrganizationsUsersBookingsController {
  constructor(private readonly organizationUsersBookingsService: OrganizationUsersBookingsService) {}

  @Get("/")
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @ApiOperation({ summary: "Get all bookings for an organization user" })
  async getOrganizationUserBookings(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Query() query: GetBookingsInput_2024_08_13
  ): Promise<GetBookingsOutput_2024_08_13> {
    const { bookings, pagination } = await this.organizationUsersBookingsService.getOrganizationUserBookings(
      orgId,
      userId,
      query
    );

    return {
      status: SUCCESS_STATUS,
      data: bookings,
      pagination,
    };
  }
}
