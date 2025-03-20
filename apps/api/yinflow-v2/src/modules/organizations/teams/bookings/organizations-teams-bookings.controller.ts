import { Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { GetBookingsOutput_2024_08_13 } from "@calcom/platform-types";

import { BookingsService_2024_08_13 } from "../../../../ee/bookings/2024-08-13/services/bookings.service";
import { API_VERSIONS_VALUES } from "../../../../lib/api-versions";
import { PlatformPlan } from "../../../auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "../../../auth/decorators/get-user/get-user.decorator";
import { Roles } from "../../../auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "../../../auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "../../../auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "../../../auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "../../../auth/guards/organizations/is-org.guard";
import { RolesGuard } from "../../../auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "../../../auth/guards/teams/is-team-in-org.guard";
import { GetOrganizationsTeamsBookingsInput_2024_08_13 } from "../../../organizations/teams/bookings/inputs/get-organizations-teams-bookings.input";
import { UserWithProfile } from "../../../users/users.repository";

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
