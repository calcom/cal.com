import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { GetBookingsOutput_2024_08_13, GetOrganizationsBookingsInput } from "@calcom/platform-types";
import { Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  OPTIONAL_API_KEY_HEADER,
  OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER,
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
} from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { UserWithProfile } from "@/modules/users/users.repository";

@Controller({
  path: "/v2/organizations/:orgId/bookings",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Bookings")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER)
export class OrganizationsBookingsController {
  constructor(private readonly bookingsService: BookingsService_2024_08_13) {}

  @Get("/")
  @ApiOperation({ summary: "Get organization bookings" })
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @HttpCode(HttpStatus.OK)
  async getAllOrgTeamBookings(
    @Query() queryParams: GetOrganizationsBookingsInput,
    @Param("orgId", ParseIntPipe) orgId: number,
    @GetUser() user: UserWithProfile
  ): Promise<GetBookingsOutput_2024_08_13> {
    const { userIds, ...restParams } = queryParams;

    const { bookings, pagination } = await this.bookingsService.getBookings(
      { ...restParams },
      { email: user.email, id: user.id, orgId },
      userIds
    );

    return {
      status: SUCCESS_STATUS,
      data: bookings,
      pagination,
    };
  }
}
