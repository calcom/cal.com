import { BookingUidGuard } from "@/ee/bookings/2024-08-13/guards/booking-uid.guard";
import { AddGuestsOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/add-guests.output";
import { BookingGuestsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/booking-guests.service";
import { VERSION_2024_08_13_VALUE, VERSION_2024_08_13 } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { Controller, Post, Logger, Body, UseGuards, Param, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags, ApiHeader } from "@nestjs/swagger";

import { BOOKING_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import { AddGuestsInput_2024_08_13 } from "@calcom/platform-types";

@Controller({
  path: "/v2/bookings/:bookingUid/location",
  version: VERSION_2024_08_13_VALUE,
})
@UseGuards(PermissionsGuard)
@DocsTags("Bookings / Location")
@ApiHeader({
  name: "cal-api-version",
  description: `Must be set to ${VERSION_2024_08_13}. This header is required as this endpoint does not exist in older API versions.`,
  example: VERSION_2024_08_13,
  required: true,
})
export class BookingLocationController_2024_08_13 {
  private readonly logger = new Logger("BookingLocationController_2024_08_13");

  // there should be a new service for booking loction like booking guests
  constructor(private readonly bookingGuestsService: BookingGuestsService_2024_08_13) {}

  @Post("/")
  @HttpCode(HttpStatus.OK)
  @Permissions([BOOKING_WRITE])
  @UseGuards(ApiAuthGuard, BookingUidGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Update booking location for an existing booking",
    description: `Update booking location for an existing booking.
    
    <Note>The cal-api-version header is required for this endpoint. Without it, the request will fail with a 404 error.</Note>
    `,
  })
  async updateBookingLocation(
    @Param("bookingUid") bookingUid: string,
    // need to add body for update booking location
    @Body() body: AddGuestsInput_2024_08_13,
    @GetUser() user: ApiAuthGuardUser
  ): Promise<AddGuestsOutput_2024_08_13> {
    // there should be a new service for booking loction like booking guests
    const booking = await this.bookingGuestsService.addGuests(bookingUid, body, user);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }
}
