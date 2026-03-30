import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ErrorWithCode, getHttpStatusCode } from "@calcom/platform-libraries/errors";
import {
  BlockOrgBookingInput,
  BlockOrgBookingOutput,
  GetBookingsOutput_2024_08_13,
  GetOrganizationsBookingsInput,
  ReportOrgBookingInput,
  ReportOrgBookingOutput,
} from "@calcom/platform-types";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER,
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
} from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { OAuthPermissions } from "@/modules/auth/decorators/oauth-permissions/oauth-permissions.decorator";
import { Pbac } from "@/modules/auth/decorators/pbac/pbac.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { PbacGuard } from "@/modules/auth/guards/pbac/pbac.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { OrganizationsBookingsBlockService } from "@/modules/organizations/bookings/services/organizations-bookings-block.service";
import { OrganizationsBookingsReportService } from "@/modules/organizations/bookings/services/organizations-bookings-report.service";
import { UserWithProfile } from "@/modules/users/users.repository";

@Controller({
  path: "/v2/organizations/:orgId/bookings",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, PbacGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Bookings")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER)
export class OrganizationsBookingsController {
  private readonly logger = new Logger("OrganizationsBookingsController");

  constructor(
    private readonly bookingsService: BookingsService_2024_08_13,
    private readonly reportService: OrganizationsBookingsReportService,
    private readonly blockService: OrganizationsBookingsBlockService
  ) {}

  @Get("/")
  @ApiOperation({
    summary: "Get organization bookings",
    description:
      "Required membership role: `org admin`. PBAC permission: `booking.readOrgBookings`. Learn more about API access control at https://cal.com/docs/api-reference/v2/access-control",
  })
  @Roles("ORG_ADMIN")
  @Pbac(["booking.readOrgBookings"])
  @PlatformPlan("ESSENTIALS")
  @OAuthPermissions(["ORG_BOOKING_READ"])
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

  @Post("/report")
  @ApiOperation({
    summary: "Report an organization booking",
    description:
      "Report a booking within the organization. A booking report is created and the reported booking along with other matching upcoming bookings are silently cancelled.",
  })
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @OAuthPermissions(["ORG_BOOKING_WRITE"])
  @HttpCode(HttpStatus.OK)
  async reportOrgBooking(
    @Body() body: ReportOrgBookingInput,
    @Param("orgId", ParseIntPipe) orgId: number,
    @GetUser() user: UserWithProfile
  ): Promise<ReportOrgBookingOutput> {
    try {
      const result = await this.reportService.report({
        bookingUid: body.bookingUid,
        reason: body.reason,
        description: body.description,
        reportType: body.reportType,
        userId: user.id,
        userEmail: user.email,
        organizationId: orgId,
        actionSource: "API_V2",
      });

      return {
        status: SUCCESS_STATUS,
        data: result,
      };
    } catch (err: unknown) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (err instanceof ErrorWithCode) {
        throw new HttpException(err.message, getHttpStatusCode(err));
      }
      this.logger.error(err);
      throw new InternalServerErrorException("Failed to report booking");
    }
  }

  @Post("/block")
  @ApiOperation({
    summary: "Block an organization booking attendee",
    description:
      "Add the email or domain of a booking attendee to the organization blocklist. All matching upcoming bookings in the organization are silently cancelled.",
  })
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @OAuthPermissions(["ORG_BOOKING_WRITE"])
  @HttpCode(HttpStatus.OK)
  async blockOrgBooking(
    @Body() body: BlockOrgBookingInput,
    @Param("orgId", ParseIntPipe) orgId: number,
    @GetUser() user: UserWithProfile
  ): Promise<BlockOrgBookingOutput> {
    try {
      const result = await this.blockService.block({
        bookingUid: body.bookingUid,
        blockType: body.blockType,
        userId: user.id,
        userEmail: user.email,
        organizationId: orgId,
        actionSource: "API_V2",
      });

      return {
        status: SUCCESS_STATUS,
        data: result,
      };
    } catch (err: unknown) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (err instanceof ErrorWithCode) {
        throw new HttpException(err.message, getHttpStatusCode(err));
      }
      this.logger.error(err);
      throw new InternalServerErrorException("Failed to block booking attendee");
    }
  }
}
