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
  path: "/v2/bookings",
  version: VERSION_2024_08_13_VALUE,
})
@UseGuards(PermissionsGuard)
@DocsTags("Bookings")
@ApiHeader({
  name: "cal-api-version",
  description: `Must be set to ${VERSION_2024_08_13}. If not set to this value, the endpoint will default to an older version.`,
  example: VERSION_2024_08_13,
  required: true,
  schema: {
    default: VERSION_2024_08_13,
  },
})
export class BookingGuestsController_2024_08_13 {
  private readonly logger = new Logger("BookingGuestsController_2024_08_13");

  constructor(private readonly bookingGuestsService: BookingGuestsService_2024_08_13) {}

  @Post("/:bookingUid/guests")
  @HttpCode(HttpStatus.OK)
  @Permissions([BOOKING_WRITE])
  @UseGuards(ApiAuthGuard, BookingUidGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Add guests to an existing booking",
    description: `Add one or more guests to an existing booking.
    <Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>
    `,
  })
  async addAttendees(
    @Param("bookingUid") bookingUid: string,
    @Body() body: AddGuestsInput_2024_08_13,
    @GetUser() user: ApiAuthGuardUser
  ): Promise<AddGuestsOutput_2024_08_13> {
    const booking = await this.bookingGuestsService.addGuests(bookingUid, body, user);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }
}
