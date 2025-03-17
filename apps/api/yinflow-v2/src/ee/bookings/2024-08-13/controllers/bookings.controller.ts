import { BookingUidGuard } from "@/ee/bookings/2024-08-13/guards/booking-uid.guard";
import { CancelBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/cancel-booking.output";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { MarkAbsentBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/mark-absent.output";
import { ReassignBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/reassign-booking.output";
import { RescheduleBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/reschedule-booking.output";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { VERSION_2024_08_13_VALUE, VERSION_2024_08_13 } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  Controller,
  Post,
  Logger,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiTags as DocsTags,
  ApiHeader,
  getSchemaPath,
  ApiBody,
  ApiExtraModels,
} from "@nestjs/swagger";
import { User } from "@prisma/client";
import { Request } from "express";

import { BOOKING_READ, BOOKING_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  CancelBookingInput,
  CancelBookingInputPipe,
  GetBookingOutput_2024_08_13,
  GetBookingsOutput_2024_08_13,
  RescheduleBookingInput,
  RescheduleBookingInputPipe,
} from "@calcom/platform-types";
import {
  CreateBookingInputPipe,
  CreateBookingInput,
  GetBookingsInput_2024_08_13,
  ReassignToUserBookingInput_2024_08_13,
  MarkAbsentBookingInput_2024_08_13,
  CreateBookingInput_2024_08_13,
  CreateInstantBookingInput_2024_08_13,
  CreateRecurringBookingInput_2024_08_13,
  DeclineBookingInput_2024_08_13,
} from "@calcom/platform-types";

@Controller({
  path: "/v2/bookings",
  version: VERSION_2024_08_13_VALUE,
})
@UseGuards(PermissionsGuard)
@DocsTags("Bookings")
@ApiHeader({
  name: "cal-api-version",
  description: `Must be set to \`2024-08-13\``,
  example: VERSION_2024_08_13,
  required: true,
})
export class BookingsController_2024_08_13 {
  private readonly logger = new Logger("BookingsController_2024_08_13");

  constructor(private readonly bookingsService: BookingsService_2024_08_13) {}

  @Post("/")
  @ApiOperation({
    summary: "Create a booking",
    description: `
      POST /v2/bookings is used to create regular bookings, recurring bookings and instant bookings. The request bodies for all 3 are almost the same except:
      If eventTypeId in the request body is id of a regular event, then regular booking is created.

      If it is an id of a recurring event type, then recurring booking is created.

      Meaning that the request bodies are equal but the outcome depends on what kind of event type it is with the goal of making it as seamless for developers as possible.

      For team event types it is possible to create instant meeting. To do that just pass \`"instant": true\` to the request body.

      The start needs to be in UTC aka if the timezone is GMT+2 in Rome and meeting should start at 11, then UTC time should have hours 09:00 aka without time zone.
      `,
  })
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(CreateBookingInput_2024_08_13) },
        { $ref: getSchemaPath(CreateInstantBookingInput_2024_08_13) },
        { $ref: getSchemaPath(CreateRecurringBookingInput_2024_08_13) },
      ],
    },
    description:
      "Accepts different types of booking input: CreateBookingInput_2024_08_13, CreateInstantBookingInput_2024_08_13, or CreateRecurringBookingInput_2024_08_13",
  })
  @ApiExtraModels(
    CreateBookingInput_2024_08_13,
    CreateInstantBookingInput_2024_08_13,
    CreateRecurringBookingInput_2024_08_13
  )
  async createBooking(
    @Body(new CreateBookingInputPipe())
    body: CreateBookingInput,
    @Req() request: Request
  ): Promise<CreateBookingOutput_2024_08_13> {
    const booking = await this.bookingsService.createBooking(request, body);

    if (Array.isArray(booking)) {
      await this.bookingsService.billBookings(booking);
    } else {
      await this.bookingsService.billBooking(booking);
    }

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }

  @Get("/:bookingUid")
  @UseGuards(BookingUidGuard)
  @ApiOperation({
    summary: "Get a booking",
    description: `\`:bookingUid\` can be

      1. uid of a normal booking

      2. uid of one of the recurring booking recurrences

      3. uid of recurring booking which will return an array of all recurring booking recurrences (stored as recurringBookingUid on one of the individual recurrences).`,
  })
  async getBooking(@Param("bookingUid") bookingUid: string): Promise<GetBookingOutput_2024_08_13> {
    const booking = await this.bookingsService.getBooking(bookingUid);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }

  @Get("/")
  @UseGuards(ApiAuthGuard)
  @ApiHeader({
    name: "Authorization",
    description:
      "value must be `Bearer <token>` where `<token>` either managed user access token or api key prefixed with cal_",
    required: true,
  })
  @Permissions([BOOKING_READ])
  @ApiOperation({ summary: "Get all bookings" })
  async getBookings(
    @Query() queryParams: GetBookingsInput_2024_08_13,
    @GetUser() user: User
  ): Promise<GetBookingsOutput_2024_08_13> {
    const bookings = await this.bookingsService.getBookings(queryParams, user);

    return {
      status: SUCCESS_STATUS,
      data: bookings,
    };
  }

  @Post("/:bookingUid/reschedule")
  @UseGuards(BookingUidGuard)
  @ApiOperation({
    summary: "Reschedule a booking",
    description:
      "Reschedule a booking by passing `:bookingUid` of the booking that should be rescheduled and pass request body with a new start time to create a new booking.",
  })
  async rescheduleBooking(
    @Param("bookingUid") bookingUid: string,
    @Body(new RescheduleBookingInputPipe())
    body: RescheduleBookingInput,
    @Req() request: Request
  ): Promise<RescheduleBookingOutput_2024_08_13> {
    const newBooking = await this.bookingsService.rescheduleBooking(request, bookingUid, body);
    await this.bookingsService.billRescheduledBooking(newBooking, bookingUid);

    return {
      status: SUCCESS_STATUS,
      data: newBooking,
    };
  }

  @Post("/:bookingUid/cancel")
  @UseGuards(BookingUidGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Cancel a booking",
    description: `:bookingUid can be :bookingUid of an usual booking, individual recurrence or recurring booking to cancel all recurrences.
    For seated bookings to cancel one individual booking provide :bookingUid and :seatUid in the request body. For recurring seated bookings it is not possible to cancel all of them with 1 call
    like with non-seated recurring bookings by providing recurring bookind uid - you have to cancel each recurrence booking by its bookingUid + seatUid.`,
  })
  async cancelBooking(
    @Req() request: Request,
    @Param("bookingUid") bookingUid: string,
    @Body(new CancelBookingInputPipe())
    body: CancelBookingInput
  ): Promise<CancelBookingOutput_2024_08_13> {
    const cancelledBooking = await this.bookingsService.cancelBooking(request, bookingUid, body);

    return {
      status: SUCCESS_STATUS,
      data: cancelledBooking,
    };
  }

  @Post("/:bookingUid/mark-absent")
  @HttpCode(HttpStatus.OK)
  @Permissions([BOOKING_WRITE])
  @UseGuards(ApiAuthGuard, BookingUidGuard)
  @ApiHeader({
    name: "Authorization",
    description:
      "value must be `Bearer <token>` where `<token>` either managed user access token or api key prefixed with cal_",
    required: true,
  })
  @ApiOperation({ summary: "Mark a booking absence" })
  async markNoShow(
    @Param("bookingUid") bookingUid: string,
    @Body() body: MarkAbsentBookingInput_2024_08_13,
    @GetUser("id") ownerId: number
  ): Promise<MarkAbsentBookingOutput_2024_08_13> {
    const booking = await this.bookingsService.markAbsent(bookingUid, ownerId, body);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }

  @Post("/:bookingUid/reassign")
  @HttpCode(HttpStatus.OK)
  @Permissions([BOOKING_WRITE])
  @UseGuards(ApiAuthGuard, BookingUidGuard)
  @ApiHeader({
    name: "Authorization",
    description:
      "value must be `Bearer <token>` where `<token>` either managed user access token or api key prefixed with cal_",
    required: true,
  })
  @ApiOperation({ summary: "Automatically reassign booking to a new host" })
  async reassignBooking(
    @Param("bookingUid") bookingUid: string,
    @GetUser() user: UserWithProfile
  ): Promise<ReassignBookingOutput_2024_08_13> {
    const booking = await this.bookingsService.reassignBooking(bookingUid, user);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }

  @Post("/:bookingUid/reassign/:userId")
  @HttpCode(HttpStatus.OK)
  @Permissions([BOOKING_WRITE])
  @UseGuards(ApiAuthGuard, BookingUidGuard)
  @ApiHeader({
    name: "Authorization",
    description:
      "value must be `Bearer <token>` where `<token>` either managed user access token or api key prefixed with cal_",
    required: true,
  })
  @ApiOperation({ summary: "Reassign a booking to a specific user" })
  async reassignBookingToUser(
    @Param("bookingUid") bookingUid: string,
    @Param("userId") userId: number,
    @GetUser("id") reassignedById: number,
    @Body() body: ReassignToUserBookingInput_2024_08_13
  ): Promise<ReassignBookingOutput_2024_08_13> {
    const booking = await this.bookingsService.reassignBookingToUser(
      bookingUid,
      userId,
      reassignedById,
      body
    );

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }

  @Post("/:bookingUid/confirm")
  @HttpCode(HttpStatus.OK)
  @Permissions([BOOKING_WRITE])
  @UseGuards(ApiAuthGuard, BookingUidGuard)
  @ApiHeader({
    name: "Authorization",
    description:
      "value must be `Bearer <token>` where `<token>` either managed user access token or api key prefixed with cal_",
    required: true,
  })
  @ApiOperation({ summary: "Confirm booking that requires a confirmation" })
  async confirmBooking(
    @Param("bookingUid") bookingUid: string,
    @GetUser() user: UserWithProfile
  ): Promise<GetBookingOutput_2024_08_13> {
    const booking = await this.bookingsService.confirmBooking(bookingUid, user);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }

  @Post("/:bookingUid/decline")
  @HttpCode(HttpStatus.OK)
  @Permissions([BOOKING_WRITE])
  @UseGuards(ApiAuthGuard, BookingUidGuard)
  @ApiHeader({
    name: "Authorization",
    description:
      "value must be `Bearer <token>` where `<token>` either managed user access token or api key prefixed with cal_",
    required: true,
  })
  @ApiOperation({ summary: "Decline booking that requires a confirmation" })
  async declineBooking(
    @Param("bookingUid") bookingUid: string,
    @Body() body: DeclineBookingInput_2024_08_13,
    @GetUser() user: UserWithProfile
  ): Promise<GetBookingOutput_2024_08_13> {
    const booking = await this.bookingsService.declineBooking(bookingUid, user, body.reason);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }
}
