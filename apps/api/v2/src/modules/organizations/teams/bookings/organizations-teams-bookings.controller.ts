import { BookingUidGuard } from "@/ee/bookings/2024-08-13/guards/booking-uid.guard";
import { BookingReferencesFilterInput_2024_08_13 } from "@/ee/bookings/2024-08-13/inputs/booking-references-filter.input";
import { BookingReferencesOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/booking-references.output";
import { BookingReferencesService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/booking-references.service";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
  OPTIONAL_API_KEY_HEADER,
  API_KEY_OR_ACCESS_TOKEN_HEADER,
} from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { GetOrganizationsTeamsBookingsInput_2024_08_13 } from "@/modules/organizations/teams/bookings/inputs/get-organizations-teams-bookings.input";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Controller, UseGuards, Get, Param, ParseIntPipe, Query, HttpStatus, HttpCode } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS, BOOKING_READ } from "@calcom/platform-constants";
import { GetBookingsOutput_2024_08_13 } from "@calcom/platform-types";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId/bookings",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Teams / Bookings")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsTeamsBookingsController {
  constructor(
    private readonly bookingsService: BookingsService_2024_08_13,
    private readonly bookingReferencesService: BookingReferencesService_2024_08_13
  ) {}

  @Get("/")
  @ApiOperation({ summary: "Get organization team bookings" })
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @HttpCode(HttpStatus.OK)
  async getAllOrgTeamBookings(
    @Query() queryParams: GetOrganizationsTeamsBookingsInput_2024_08_13,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("orgId", ParseIntPipe) orgId: number,
    @GetUser() user: UserWithProfile
  ): Promise<GetBookingsOutput_2024_08_13> {
    const { bookings, pagination } = await this.bookingsService.getBookings(
      { ...queryParams, teamId },
      { email: user.email, id: user.id, orgId }
    );

    return {
      status: SUCCESS_STATUS,
      data: bookings,
      pagination,
    };
  }

  @Get("/:bookingUid/references")
  @PlatformPlan("SCALE")
  @Roles("TEAM_ADMIN")
  @Permissions([BOOKING_READ])
  @UseGuards(
    ApiAuthGuard,
    BookingUidGuard,
    IsOrgGuard,
    RolesGuard,
    IsTeamInOrg,
    PlatformPlanGuard,
    IsAdminAPIEnabledGuard
  )
  @ApiOperation({
    summary: "Get booking references",
  })
  @HttpCode(HttpStatus.OK)
  async getBookingReferences(
    @Param("bookingUid") bookingUid: string,
    @Query() filter: BookingReferencesFilterInput_2024_08_13
  ): Promise<BookingReferencesOutput_2024_08_13> {
    const bookingReferences = await this.bookingReferencesService.getOrgBookingReferences(bookingUid, filter);

    return {
      status: SUCCESS_STATUS,
      data: bookingReferences,
    };
  }
}
