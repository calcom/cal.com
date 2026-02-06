import { BookingUidGuard } from "@/ee/bookings/2024-08-13/guards/booking-uid.guard";
import { UpdateBookingLocationOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/update-location.output";
import { BookingLocationService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/booking-location.service";
import { VERSION_2024_08_13_VALUE, VERSION_2024_08_13 } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { Controller, Patch, Logger, Body, UseGuards, Param, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiExtraModels, ApiOperation, ApiTags as DocsTags, ApiHeader } from "@nestjs/swagger";

import { BOOKING_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  UpdateBookingLocationInput_2024_08_13,
  UpdateInputAddressLocation_2024_08_13,
  UpdateBookingInputAttendeeAddressLocation_2024_08_13,
  UpdateBookingInputAttendeeDefinedLocation_2024_08_13,
  UpdateBookingInputAttendeePhoneLocation_2024_08_13,
  UpdateBookingInputLinkLocation_2024_08_13,
  UpdateBookingInputPhoneLocation_2024_08_13,
} from "@calcom/platform-types";

@Controller({
  path: "/v2/bookings/:bookingUid/location",
  version: VERSION_2024_08_13_VALUE,
})
@UseGuards(PermissionsGuard)
@DocsTags("Bookings")
@ApiExtraModels(
  UpdateInputAddressLocation_2024_08_13,
  UpdateBookingInputAttendeeAddressLocation_2024_08_13,
  UpdateBookingInputAttendeeDefinedLocation_2024_08_13,
  UpdateBookingInputAttendeePhoneLocation_2024_08_13,
  UpdateBookingInputLinkLocation_2024_08_13,
  UpdateBookingInputPhoneLocation_2024_08_13
)
@ApiHeader({
  name: "cal-api-version",
  description: `Must be set to ${VERSION_2024_08_13}. This header is required as this endpoint does not exist in older API versions.`,
  example: VERSION_2024_08_13,
  required: true,
})
export class BookingLocationController_2024_08_13 {
  private readonly logger = new Logger("BookingLocationController_2024_08_13");

  constructor(private readonly bookingLocationService: BookingLocationService_2024_08_13) {}

  @Patch("/")
  @HttpCode(HttpStatus.OK)
  @Permissions([BOOKING_WRITE])
  @UseGuards(ApiAuthGuard, BookingUidGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Update booking location for an existing booking",
    description: `**Current Limitation:** Updating a booking location will update the location in Cal.com, but the corresponding Calendar event will not be updated automatically. The old location will persist in the Calendar event. This is a known limitation that will be addressed in a future update.
    
    <Note>The cal-api-version header is required for this endpoint. Without it, the request will fail with a 404 error.</Note>`,
  })
  async updateBookingLocation(
    @Param("bookingUid") bookingUid: string,
    @Body() body: UpdateBookingLocationInput_2024_08_13,
    @GetUser() user: ApiAuthGuardUser
  ): Promise<UpdateBookingLocationOutput_2024_08_13> {
    const booking = await this.bookingLocationService.updateBookingLocation(bookingUid, body, user);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }
}
