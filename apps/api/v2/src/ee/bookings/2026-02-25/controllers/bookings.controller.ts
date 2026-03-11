import { BOOKING_READ, BOOKING_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  CancelBookingInput,
  CancelBookingInput_2024_08_13,
  CancelBookingInputPipe,
  CancelSeatedBookingInput_2024_08_13,
  CreateBookingInput,
  CreateBookingInput_2024_08_13,
  CreateBookingInputPipe,
  CreateInstantBookingInput_2024_08_13,
  CreateRecurringBookingInput_2024_08_13,
  DeclineBookingInput_2024_08_13,
  GetBookingOutput_2024_08_13,
  GetBookingRecordingsOutput,
  GetBookingsInput_2024_08_13,
  GetBookingsOutput_2024_08_13,
  GetBookingTranscriptsOutput,
  GetBookingVideoSessionsOutput,
  MarkAbsentBookingInput_2024_08_13,
  ReassignToUserBookingInput_2024_08_13,
  RescheduleBookingInput,
  RescheduleBookingInput_2024_08_13,
  RescheduleBookingInputPipe,
  RescheduleSeatedBookingInput_2024_08_13,
} from "@calcom/platform-types";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiExtraModels,
  ApiHeader,
  ApiOperation,
  ApiTags as DocsTags,
  getSchemaPath,
} from "@nestjs/swagger";
import { Request } from "express";
import { BookingPbacGuard } from "@/ee/bookings/2024-08-13/guards/booking-pbac.guard";
import { BookingUidGuard } from "@/ee/bookings/2024-08-13/guards/booking-uid.guard";
import { BookingReferencesFilterInput_2024_08_13 } from "@/ee/bookings/2024-08-13/inputs/booking-references-filter.input";
import { BookingReferencesOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/booking-references.output";
import { CalendarLinksOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/calendar-links.output";
import { CancelBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/cancel-booking.output";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { MarkAbsentBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/mark-absent.output";
import { ReassignBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/reassign-booking.output";
import { RescheduleBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/reschedule-booking.output";
import { BookingReferencesService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/booking-references.service";
import { CalVideoService } from "@/ee/bookings/2024-08-13/services/cal-video.service";
import { BookingsService_2026_02_25 } from "@/ee/bookings/2026-02-25/services/bookings.service";
import { VERSION_2026_02_25, VERSION_2026_02_25_VALUE } from "@/lib/api-versions";
import {
  API_KEY_OR_ACCESS_TOKEN_HEADER,
  OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER,
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
} from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import {
  AuthOptionalUser,
  GetOptionalUser,
} from "@/modules/auth/decorators/get-optional-user/get-optional-user.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Pbac } from "@/modules/auth/decorators/pbac/pbac.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { OptionalApiAuthGuard } from "@/modules/auth/guards/optional-api-auth/optional-api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { UsersService } from "@/modules/users/services/users.service";

@Controller({
  path: "/v2/bookings",
  version: VERSION_2026_02_25_VALUE,
})
@UseGuards(PermissionsGuard)
@DocsTags("Bookings")
@ApiHeader({
  name: "cal-api-version",
  description: `Must be set to ${VERSION_2026_02_25}.`,
  example: VERSION_2026_02_25,
  required: true,
  schema: {
    default: VERSION_2026_02_25,
  },
})
export class BookingsController_2026_02_25 {
  private readonly logger = new Logger("BookingsController_2026_02_25");

  constructor(
    private readonly bookingsService: BookingsService_2026_02_25,
    private readonly usersService: UsersService,
    private readonly bookingReferencesService: BookingReferencesService_2024_08_13,
    private readonly calVideoService: CalVideoService
  ) {}

  @Post("/")
  @UseGuards(OptionalApiAuthGuard)
  @ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
  @ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
  @ApiHeader(OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Create a booking" })
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(CreateBookingInput_2024_08_13) },
        { $ref: getSchemaPath(CreateInstantBookingInput_2024_08_13) },
        { $ref: getSchemaPath(CreateRecurringBookingInput_2024_08_13) },
      ],
    },
  })
  @ApiExtraModels(
    CreateBookingInput_2024_08_13,
    CreateInstantBookingInput_2024_08_13,
    CreateRecurringBookingInput_2024_08_13
  )
  async createBooking(
    @Body(new CreateBookingInputPipe()) body: CreateBookingInput,
    @Req() request: Request,
    @GetOptionalUser() user: AuthOptionalUser
  ): Promise<CreateBookingOutput_2024_08_13> {
    const booking = await this.bookingsService.createBooking(request, body, user);

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

  @Get("/by-seat/:seatUid")
  @UseGuards(OptionalApiAuthGuard)
  @ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
  @ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
  @ApiHeader(OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get a booking by seat UID" })
  async getBookingBySeatUid(
    @Param("seatUid") seatUid: string,
    @GetOptionalUser() user: AuthOptionalUser
  ): Promise<GetBookingOutput_2024_08_13> {
    const booking = await this.bookingsService.getBookingBySeatUid(seatUid, user);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }

  @Get("/:bookingUid")
  @UseGuards(BookingUidGuard, OptionalApiAuthGuard)
  @ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
  @ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
  @ApiHeader(OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get a booking" })
  async getBooking(
    @Param("bookingUid") bookingUid: string,
    @GetOptionalUser() user: AuthOptionalUser
  ): Promise<GetBookingOutput_2024_08_13> {
    const booking = await this.bookingsService.getBooking(bookingUid, user);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }

  @Get("/:bookingUid/recordings")
  @Pbac(["booking.readRecordings"])
  @Permissions([BOOKING_READ])
  @UseGuards(ApiAuthGuard, BookingUidGuard, BookingPbacGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get all the recordings for the booking" })
  async getBookingRecordings(@Param("bookingUid") bookingUid: string): Promise<GetBookingRecordingsOutput> {
    const recordings = await this.calVideoService.getRecordings(bookingUid);

    return {
      status: SUCCESS_STATUS,
      data: recordings,
    };
  }

  @Get("/:bookingUid/transcripts")
  @Pbac(["booking.readRecordings"])
  @Permissions([BOOKING_READ])
  @UseGuards(ApiAuthGuard, BookingUidGuard, BookingPbacGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get all the transcripts for the booking" })
  async getBookingTranscripts(@Param("bookingUid") bookingUid: string): Promise<GetBookingTranscriptsOutput> {
    const transcripts = await this.calVideoService.getTranscripts(bookingUid);

    return {
      status: SUCCESS_STATUS,
      data: transcripts ?? [],
    };
  }

  @Get("/")
  @Permissions([BOOKING_READ])
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get all bookings" })
  async getBookings(
    @Query() queryParams: GetBookingsInput_2024_08_13,
    @GetUser() user: ApiAuthGuardUser
  ): Promise<GetBookingsOutput_2024_08_13> {
    const profile = this.usersService.getUserMainProfile(user);

    const { bookings, pagination } = await this.bookingsService.getBookings(queryParams, {
      email: user.email,
      id: user.id,
      orgId: profile?.organizationId ?? undefined,
    });

    return {
      status: SUCCESS_STATUS,
      data: bookings,
      pagination,
    };
  }

  @Post("/:bookingUid/reschedule")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OptionalApiAuthGuard)
  @ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
  @ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
  @ApiHeader(OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Reschedule a booking" })
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(RescheduleBookingInput_2024_08_13) },
        { $ref: getSchemaPath(RescheduleSeatedBookingInput_2024_08_13) },
      ],
    },
  })
  @ApiExtraModels(RescheduleBookingInput_2024_08_13, RescheduleSeatedBookingInput_2024_08_13)
  async rescheduleBooking(
    @Req() request: Request,
    @Param("bookingUid") bookingUid: string,
    @Body(new RescheduleBookingInputPipe()) body: RescheduleBookingInput,
    @GetOptionalUser() user: AuthOptionalUser
  ): Promise<RescheduleBookingOutput_2024_08_13> {
    const booking = await this.bookingsService.rescheduleBooking(request, bookingUid, body, user);

    if (Array.isArray(booking)) {
      await this.bookingsService.billBookings(booking);
    } else {
      await this.bookingsService.billRescheduledBooking(booking, bookingUid);
    }

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }

  @Post("/:bookingUid/cancel")
  @HttpCode(HttpStatus.OK)
  @UseGuards(BookingUidGuard, OptionalApiAuthGuard)
  @ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
  @ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
  @ApiHeader(OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Cancel a booking" })
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(CancelBookingInput_2024_08_13) },
        { $ref: getSchemaPath(CancelSeatedBookingInput_2024_08_13) },
      ],
    },
  })
  @ApiExtraModels(CancelBookingInput_2024_08_13, CancelSeatedBookingInput_2024_08_13)
  async cancelBooking(
    @Req() request: Request,
    @Param("bookingUid") bookingUid: string,
    @Body(new CancelBookingInputPipe()) body: CancelBookingInput,
    @GetOptionalUser() user: AuthOptionalUser
  ): Promise<CancelBookingOutput_2024_08_13> {
    const cancelledBooking = await this.bookingsService.cancelBooking(request, bookingUid, body, user);

    return {
      status: SUCCESS_STATUS,
      data: cancelledBooking,
    };
  }

  @Post("/:bookingUid/mark-absent")
  @HttpCode(HttpStatus.OK)
  @Permissions([BOOKING_WRITE])
  @UseGuards(ApiAuthGuard, BookingUidGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Mark a booking absence" })
  async markNoShow(
    @Param("bookingUid") bookingUid: string,
    @Body() body: MarkAbsentBookingInput_2024_08_13,
    @GetUser() user: ApiAuthGuardUser
  ): Promise<MarkAbsentBookingOutput_2024_08_13> {
    const booking = await this.bookingsService.markAbsent(bookingUid, user.id, body, user.uuid);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }

  @Post("/:bookingUid/reassign")
  @HttpCode(HttpStatus.OK)
  @Permissions([BOOKING_WRITE])
  @UseGuards(ApiAuthGuard, BookingUidGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Reassign a booking to auto-selected host" })
  async reassignBooking(
    @Param("bookingUid") bookingUid: string,
    @GetUser() reassignedByUser: ApiAuthGuardUser
  ): Promise<ReassignBookingOutput_2024_08_13> {
    const booking = await this.bookingsService.reassignBooking(bookingUid, reassignedByUser);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }

  @Post("/:bookingUid/reassign/:userId")
  @HttpCode(HttpStatus.OK)
  @Permissions([BOOKING_WRITE])
  @UseGuards(ApiAuthGuard, BookingUidGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Reassign a booking to a specific host" })
  async reassignBookingToUser(
    @Param("bookingUid") bookingUid: string,
    @Param("userId") userId: number,
    @GetUser() reassignedByUser: ApiAuthGuardUser,
    @Body() body: ReassignToUserBookingInput_2024_08_13
  ): Promise<ReassignBookingOutput_2024_08_13> {
    const booking = await this.bookingsService.reassignBookingToUser(
      bookingUid,
      userId,
      reassignedByUser,
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
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Confirm a booking" })
  async confirmBooking(
    @Param("bookingUid") bookingUid: string,
    @GetUser() user: ApiAuthGuardUser
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
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Decline a booking" })
  async declineBooking(
    @Param("bookingUid") bookingUid: string,
    @Body() body: DeclineBookingInput_2024_08_13,
    @GetUser() user: ApiAuthGuardUser
  ): Promise<GetBookingOutput_2024_08_13> {
    const booking = await this.bookingsService.declineBooking(bookingUid, user, body.reason);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }

  @Get("/:bookingUid/calendar-links")
  @UseGuards(ApiAuthGuard, BookingUidGuard)
  @Permissions([BOOKING_READ])
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get Add to Calendar links for a booking" })
  @HttpCode(HttpStatus.OK)
  async getCalendarLinks(@Param("bookingUid") bookingUid: string): Promise<CalendarLinksOutput_2024_08_13> {
    const calendarLinks = await this.bookingsService.getCalendarLinks(bookingUid);

    return {
      status: SUCCESS_STATUS,
      data: calendarLinks,
    };
  }

  @Get("/:bookingUid/references")
  @PlatformPlan("SCALE")
  @UseGuards(ApiAuthGuard, BookingUidGuard)
  @Permissions([BOOKING_READ])
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get booking references" })
  @HttpCode(HttpStatus.OK)
  async getBookingReferences(
    @Param("bookingUid") bookingUid: string,
    @GetUser("id") userId: number,
    @Query() filter: BookingReferencesFilterInput_2024_08_13
  ): Promise<BookingReferencesOutput_2024_08_13> {
    const bookingReferences = await this.bookingReferencesService.getBookingReferences(
      bookingUid,
      userId,
      filter
    );

    return {
      status: SUCCESS_STATUS,
      data: bookingReferences,
    };
  }

  @Get("/:bookingUid/conferencing-sessions")
  @HttpCode(HttpStatus.OK)
  @Pbac(["booking.readRecordings"])
  @Permissions([BOOKING_READ])
  @UseGuards(ApiAuthGuard, BookingUidGuard, BookingPbacGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get Video Meeting Sessions" })
  async getVideoSessions(@Param("bookingUid") bookingUid: string): Promise<GetBookingVideoSessionsOutput> {
    const sessions = await this.calVideoService.getVideoSessions(bookingUid);

    return {
      status: SUCCESS_STATUS,
      data: sessions,
    };
  }
}
