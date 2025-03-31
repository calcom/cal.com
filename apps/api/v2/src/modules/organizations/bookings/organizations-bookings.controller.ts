import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { OrganizationsUsersService } from "@/modules/organizations/users/index/services/organizations-users-service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Controller, UseGuards, Get, Param, ParseIntPipe, Query, HttpStatus, HttpCode } from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { GetBookingsOutput_2024_08_13 } from "@calcom/platform-types";

import { GetOrganizationsBookingsInput } from "./inputs/get-org-bookings.input";

@Controller({
  path: "/v2/organizations/:orgId/bookings",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Bookings")
export class OrganizationsBookingsController {
  constructor(
    private readonly bookingsService: BookingsService_2024_08_13,
    private readonly orgUsersService: OrganizationsUsersService
  ) {}

  @Get("/")
  @ApiOperation({ summary: "Get organization team bookings" })
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @HttpCode(HttpStatus.OK)
  async getAllOrgTeamBookings(
    @Query() queryParams: GetOrganizationsBookingsInput,
    @Param("orgId", ParseIntPipe) orgId: number,
    @GetUser() user: UserWithProfile
  ): Promise<GetBookingsOutput_2024_08_13> {
    const { userIds, ...restParams } = queryParams;

    const userIdsForBookings = userIds
      ? await this.orgUsersService.getUsersByIds(orgId, userIds)
      : await this.orgUsersService.getUsers(orgId);

    const bookings = await this.bookingsService.getBookings(
      { ...restParams },
      user,
      (userIdsForBookings ?? []).map((u) => u.id)
    );

    return {
      status: SUCCESS_STATUS,
      data: bookings,
    };
  }
}
