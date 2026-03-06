import {
  BOOKING_WRITE,
  BOOKING_READ,
  SUCCESS_STATUS,
} from "@calcom/platform-constants";
import { AddAttendeeInput_2024_08_13 } from "@calcom/platform-types";
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  Get,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { BookingPbacGuard } from "@/ee/bookings/2024-08-13/guards/booking-pbac.guard";
import { BookingUidGuard } from "@/ee/bookings/2024-08-13/guards/booking-uid.guard";
import { AddAttendeeOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/add-attendee.output";
import {
  GetBookingAttendeesOutput_2024_08_13,
  GetBookingAttendeeOutput_2024_08_13,
} from "@/ee/bookings/2024-08-13/outputs/get-booking-attendees.output";
import { BookingAttendeesService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/booking-attendees.service";
import { VERSION_2024_08_13, VERSION_2026_02_25 } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { Throttle } from "@/lib/endpoint-throttler-decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";

@Controller({
  path: "/v2/bookings/:bookingUid/attendees",
  version: [VERSION_2024_08_13, VERSION_2026_02_25],
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
  constructor(
    private readonly bookingAttendeesService: BookingAttendeesService_2024_08_13
  ) {}

  @Get("/")
  @Permissions([BOOKING_READ])
  @UseGuards(ApiAuthGuard, BookingUidGuard, BookingPbacGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Get all attendees for a booking",
    description: `Retrieve all attendees for a specific booking by its UID.
    
    <Note>The cal-api-version header is required for this endpoint. Without it, the request will fail with a 404 error.</Note>
    `,
  })
  async getBookingAttendees(
    @Param("bookingUid") bookingUid: string,
    @GetUser() user: ApiAuthGuardUser
  ): Promise<GetBookingAttendeesOutput_2024_08_13> {
    const attendees = await this.bookingAttendeesService.getBookingAttendees(
      bookingUid
    );

    return {
      status: SUCCESS_STATUS,
      data: attendees,
    };
  }

  @Get("/:attendeeId")
  @Permissions([BOOKING_READ])
  @UseGuards(ApiAuthGuard, BookingUidGuard, BookingPbacGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Get a specific attendee for a booking",
    description: `Retrieve a specific attendee by their ID for a booking identified by its UID.
        
      <Note>The cal-api-version header is required for this endpoint. Without it, the request will fail with a 404 error.</Note>
      `,
  })
  async getBookingAttendee(
    @Param("bookingUid") bookingUid: string,
    @Param("attendeeId", ParseIntPipe) attendeeId: number
  ): Promise<GetBookingAttendeeOutput_2024_08_13> {
    const attendee = await this.bookingAttendeesService.getBookingAttendee(
      bookingUid,
      attendeeId
    );

    return {
      status: SUCCESS_STATUS,
      data: attendee,
    };
  }

  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @Permissions([BOOKING_WRITE])
  @UseGuards(ApiAuthGuard, BookingUidGuard, BookingPbacGuard)
  @Throttle({
    limit: 5,
    ttl: 60000,
    blockDuration: 60000,
    name: "booking_attendees_add",
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Add an attendee to a booking",
    description: `Add a new attendee to an existing booking by its UID.

      **Side effects:**
      - The booking's attendee list is updated in the database
      - The calendar event is updated on connected calendars (Google Calendar, Outlook, etc.) to include the new attendee
      - An email notification is sent to the new attendee with the booking details

      **Permissions:**
      - The authenticated user must be either the booking organizer, an existing attendee, or have the \`booking.update\` permission for the team

      <Note>The cal-api-version header is required for this endpoint. Without it, the request will fail with a 404 error.</Note>
      `,
  })
  async addAttendee(
    @Param("bookingUid") bookingUid: string,
    @Body() body: AddAttendeeInput_2024_08_13,
    @GetUser() user: ApiAuthGuardUser
  ): Promise<AddAttendeeOutput_2024_08_13> {
    const attendee = await this.bookingAttendeesService.addAttendee(
      bookingUid,
      body,
      user
    );

    return {
      status: SUCCESS_STATUS,
      data: attendee,
    };
  }
}
