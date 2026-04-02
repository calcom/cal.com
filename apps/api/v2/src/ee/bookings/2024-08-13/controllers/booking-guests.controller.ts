import { BOOKING_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import { AddGuestsInput_2024_08_13 } from "@calcom/platform-types";
import { Body, Controller, HttpCode, HttpStatus, Logger, Param, Post, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { BookingUidGuard } from "@/ee/bookings/2024-08-13/guards/booking-uid.guard";
import { AddGuestsOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/add-guests.output";
import { BookingGuestsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/booking-guests.service";
import { VERSION_2024_08_13, VERSION_2024_08_13_VALUE } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { Throttle } from "@/lib/endpoint-throttler-decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";

@Controller({
  path: "/v2/bookings/:bookingUid/guests",
  version: VERSION_2024_08_13_VALUE,
})
@UseGuards(PermissionsGuard)
@DocsTags("Bookings / Guests")
@ApiHeader({
  name: "cal-api-version",
  description: `Must be set to ${VERSION_2024_08_13}. This header is required as this endpoint does not exist in older API versions.`,
  example: VERSION_2024_08_13,
  required: true,
})
export class BookingGuestsController_2024_08_13 {
  private readonly logger = new Logger("BookingGuestsController_2024_08_13");

  constructor(private readonly bookingGuestsService: BookingGuestsService_2024_08_13) {}

  @Post("/")
  @HttpCode(HttpStatus.OK)
  @Permissions([BOOKING_WRITE])
  @UseGuards(ApiAuthGuard, BookingUidGuard)
  @Throttle({
    limit: 5,
    ttl: 60000,
    blockDuration: 60000,
    name: "booking_guests_add",
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Add guests to an existing booking",
    description: `Add one or more guests to an existing booking. Maximum 10 guests per request, with a limit of 30 total guests per booking.
    
    **Rate Limiting:**
    This endpoint is rate limited to 5 requests per minute to prevent abuse.
    
    **Email Notifications:**
    When guests are added, the following notifications are sent (unless disabled by event type settings):
    
    - **Organizer & Team Members:** Receive an "Add Guests" notification email informing them that new guests have been added to the booking.
    
    - **New Guests:** Receive a "Scheduled Event" email with full booking details and calendar invite. If they have a phone number, they also receive an SMS notification.
    
    - **Existing Guests:** Receive an "Add Guests" notification email informing them that additional guests have been added to the booking.
    
    <Note>The cal-api-version header is required for this endpoint. Without it, the request will fail with a 404 error.</Note>
    `,
  })
  async addGuests(
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
