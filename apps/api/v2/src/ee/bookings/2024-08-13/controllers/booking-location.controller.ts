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
import { ApiOperation, ApiTags as DocsTags, ApiHeader, ApiBody, ApiExtraModels, getSchemaPath } from "@nestjs/swagger";

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
@ApiHeader({
  name: "cal-api-version",
  description: `Must be set to ${VERSION_2024_08_13}. This header is required as this endpoint does not exist in older API versions.`,
  example: VERSION_2024_08_13,
  required: true,
})
@ApiExtraModels(
  UpdateInputAddressLocation_2024_08_13,
  UpdateBookingInputAttendeeAddressLocation_2024_08_13,
  UpdateBookingInputAttendeeDefinedLocation_2024_08_13,
  UpdateBookingInputAttendeePhoneLocation_2024_08_13,
  UpdateBookingInputLinkLocation_2024_08_13,
  UpdateBookingInputPhoneLocation_2024_08_13
)
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
    description: `Update the location of an existing booking. This endpoint supports 6 location types:

- \`address\` - Organizer-defined physical address
- \`link\` - Organizer-defined link (e.g., video call URL)
- \`phone\` - Organizer-defined phone number
- \`attendeeAddress\` - Attendee-provided physical address
- \`attendeePhone\` - Attendee-provided phone number
- \`attendeeDefined\` - Free-form location text from attendee

**Authorization:** Requires BOOKING_WRITE permission. User must be the event type owner, host, team admin/owner, or organization admin/owner.

**Current Limitation:** Updating a booking location will update the location in Cal.com, but the corresponding Calendar event will not be updated automatically. The old location will persist in the Calendar event. This is a known limitation that will be addressed in a future update.

<Note>The \`cal-api-version: 2024-08-13\` header is required for this endpoint. Without it, the request will fail with a 404 error.</Note>`,
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        location: {
          oneOf: [
            { $ref: getSchemaPath(UpdateInputAddressLocation_2024_08_13) },
            { $ref: getSchemaPath(UpdateBookingInputLinkLocation_2024_08_13) },
            { $ref: getSchemaPath(UpdateBookingInputPhoneLocation_2024_08_13) },
            { $ref: getSchemaPath(UpdateBookingInputAttendeeAddressLocation_2024_08_13) },
            { $ref: getSchemaPath(UpdateBookingInputAttendeePhoneLocation_2024_08_13) },
            { $ref: getSchemaPath(UpdateBookingInputAttendeeDefinedLocation_2024_08_13) },
          ],
        },
      },
    },
    description: `The location object to update the booking with. Supported location types are: address, link, phone, attendeeAddress, attendeePhone, and attendeeDefined.`,
    examples: {
      address: {
        summary: "Update to physical address",
        value: {
          location: {
            type: "address",
            address: "123 Main St, San Francisco, CA 94102",
          },
        },
      },
      link: {
        summary: "Update to video call link",
        value: {
          location: {
            type: "link",
            link: "https://meet.google.com/abc-defg-hij",
          },
        },
      },
      phone: {
        summary: "Update to phone number",
        value: {
          location: {
            type: "phone",
            phone: "+14155551234",
          },
        },
      },
      attendeeAddress: {
        summary: "Update to attendee-provided address",
        value: {
          location: {
            type: "attendeeAddress",
            address: "456 Oak Ave, New York, NY 10001",
          },
        },
      },
      attendeePhone: {
        summary: "Update to attendee-provided phone",
        value: {
          location: {
            type: "attendeePhone",
            phone: "+12125551234",
          },
        },
      },
      attendeeDefined: {
        summary: "Update to attendee-defined location",
        value: {
          location: {
            type: "attendeeDefined",
            location: "Coffee shop on 5th Avenue",
          },
        },
      },
    },
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
