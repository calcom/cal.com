import { BookingUidGuard } from "@/ee/bookings/2024-08-13/guards/booking-uid.guard";
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
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { GetOrganizationsTeamsBookingsInput_2024_08_13 } from "@/modules/organizations/controllers/teams/bookings/inputs/get-organizations-teams-bookings.input";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Controller, UseGuards, Get, Param, ParseIntPipe, Query, HttpStatus, HttpCode } from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { GetBookingsOutput_2024_08_13 } from "@calcom/platform-types";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId/bookings",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Teams / Bookings")
export class OrganizationsTeamsBookingsController {
  constructor(private readonly bookingsService: BookingsService_2024_08_13) {}

  @Get("/")
  @ApiOperation({ summary: "Get organization team bookings" })
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @HttpCode(HttpStatus.OK)
  async getAllOrgTeamBookings(
    @Query() queryParams: GetOrganizationsTeamsBookingsInput_2024_08_13,
    @Param("teamId", ParseIntPipe) teamId: number,
    @GetUser() user: UserWithProfile
  ): Promise<GetBookingsOutput_2024_08_13> {
    const bookings = await this.bookingsService.getBookings({ ...queryParams, teamId }, user);

    return {
      status: SUCCESS_STATUS,
      data: bookings,
    };
  }
}
