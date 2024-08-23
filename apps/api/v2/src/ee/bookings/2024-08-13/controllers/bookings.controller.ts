import { CancelBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/cancel-booking.output";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { GetBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/get-booking.output";
import { GetBookingsOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/get-bookings.output";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { VERSION_2024_08_13_VALUE } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
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
  BadRequestException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { User } from "@prisma/client";
import { Request } from "express";

import { BOOKING_READ, SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  CreateBookingInputPipe,
  CreateBookingInput,
  GetBookingsInput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
  CancelBookingInput_2024_08_13,
} from "@calcom/platform-types";

@Controller({
  path: "/v2/bookings",
  version: VERSION_2024_08_13_VALUE,
})
@UseGuards(PermissionsGuard)
@DocsTags("Bookings")
export class BookingsController_2024_08_13 {
  private readonly logger = new Logger("BookingsController");

  constructor(private readonly bookingsService: BookingsService_2024_08_13) {}

  @Post("/")
  async createBooking(
    @Body(new CreateBookingInputPipe())
    body: CreateBookingInput,
    @Req() request: Request
  ): Promise<CreateBookingOutput_2024_08_13> {
    const booking = await this.bookingsService.createBooking(request, body);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }

  @Get("/:bookingUid")
  async getBooking(@Param("bookingUid") bookingUid: string): Promise<GetBookingOutput_2024_08_13> {
    if (!bookingUid) {
      throw new BadRequestException("Booking UID is required in request path /:bookingUid");
    }

    const booking = await this.bookingsService.getBooking(bookingUid);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }

  @Get("/")
  @UseGuards(ApiAuthGuard)
  @Permissions([BOOKING_READ])
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
  async rescheduleBooking(
    @Param("bookingUid") bookingUid: string,
    @Body() body: RescheduleBookingInput_2024_08_13,
    @Req() request: Request
  ): Promise<CreateBookingOutput_2024_08_13> {
    if (!bookingUid) {
      throw new BadRequestException("Booking UID is required in request path /:bookingUid/reschedule");
    }

    const newBooking = await this.bookingsService.rescheduleBooking(request, bookingUid, body);

    return {
      status: SUCCESS_STATUS,
      data: newBooking,
    };
  }

  @Post("/:bookingUid/cancel")
  @HttpCode(HttpStatus.OK)
  async cancelBooking(
    @Req() request: Request,
    @Param("bookingUid") bookingUid: string,
    @Body() body: CancelBookingInput_2024_08_13
  ): Promise<CancelBookingOutput_2024_08_13> {
    if (!bookingUid) {
      throw new BadRequestException("Booking UID is required in request path /:bookingUid/cancel");
    }

    console.log("asap here");

    const cancelledBooking = await this.bookingsService.cancelBooking(request, bookingUid, body);

    return {
      status: SUCCESS_STATUS,
      data: cancelledBooking,
    };
  }
}
