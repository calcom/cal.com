import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { GetBookingsOutput_2024_08_13 } from "@calcom/platform-types";
import { Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { GetTeamsBookingsInput_2024_08_13 } from "@/modules/teams/bookings/inputs/get-teams-bookings.input";
import { UserWithProfile } from "@/modules/users/users.repository";

@Controller({
  path: "/v2/teams/:teamId/bookings",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, RolesGuard)
@DocsTags("Teams / Bookings")
@ApiHeader(API_KEY_HEADER)
export class TeamsBookingsController {
  constructor(private readonly bookingsService: BookingsService_2024_08_13) {}

  @Get("/")
  @ApiOperation({ summary: "Get team bookings" })
  @Roles("TEAM_ADMIN")
  @HttpCode(HttpStatus.OK)
  async getAllTeamBookings(
    @Query() queryParams: GetTeamsBookingsInput_2024_08_13,
    @Param("teamId", ParseIntPipe) teamId: number,
    @GetUser() user: UserWithProfile
  ): Promise<GetBookingsOutput_2024_08_13> {
    const { bookings, pagination } = await this.bookingsService.getBookings(
      { ...queryParams, teamId },
      { email: user.email, id: user.id }
    );

    return {
      status: SUCCESS_STATUS,
      data: bookings,
      pagination,
    };
  }
}
