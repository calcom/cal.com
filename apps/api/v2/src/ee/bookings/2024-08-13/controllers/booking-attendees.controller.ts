import { BookingUidGuard } from "@/ee/bookings/2024-08-13/guards/booking-uid.guard";
import { AddAttendeesOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/add-attendees.output";
import { BookingAttendeesService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/booking-attendees.service";
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
import { AddAttendeesInput_2024_08_13 } from "@calcom/platform-types";

@Controller({
  path: "/v2/bookings/:bookingUid/attendees",
  version: VERSION_2024_08_13_VALUE,
})
@UseGuards(PermissionsGuard)
@DocsTags("Bookings / Attendees")
@ApiHeader({
  name: "cal-api-version",
  description: `Must be set to ${VERSION_2024_08_13}. This header is required as this endpoint does not exist in older API versions.`,
  example: VERSION_2024_08_13,
  required: true,
})
export class BookingAttendeesController_2024_08_13 {
  private readonly logger = new Logger("BookingAttendeesController_2024_08_13");

  constructor(private readonly bookingAttendeesService: BookingAttendeesService_2024_08_13) {}

  @Post("/")
  @HttpCode(HttpStatus.OK)
  @Permissions([BOOKING_WRITE])
  @UseGuards(ApiAuthGuard, BookingUidGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Add attendees to an existing booking",
    description: `Add one or more attendees to an existing booking.
    
    **Email Notifications:**
    When attendees are added, the following notifications are sent (unless disabled by event type settings):
    
    - **Organizer & Team Members:** Receive an "Add Guests" notification email informing them that new attendees have been added to the booking.
    
    - **New Attendees:** Receive a "Scheduled Event" email with full booking details and calendar invite. If they have a phone number, they also receive an SMS notification.
    
    - **Existing Attendees:** Receive an "Add Guests" notification email informing them that additional attendees have been added to the booking.
    
    <Note>The cal-api-version header is required for this endpoint. Without it, the request will fail with a 404 error.</Note>
    `,
  })
  async addAttendees(
    @Param("bookingUid") bookingUid: string,
    @Body() body: AddAttendeesInput_2024_08_13,
    @GetUser() user: ApiAuthGuardUser
  ): Promise<AddAttendeesOutput_2024_08_13> {
    const booking = await this.bookingAttendeesService.addAttendees(bookingUid, body, user);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }
}
