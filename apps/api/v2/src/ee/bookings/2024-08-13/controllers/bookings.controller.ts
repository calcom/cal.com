import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { GetBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/get-booking.output";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { VERSION_2024_08_13_VALUE } from "@/lib/api-versions";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { Controller, Post, Logger, Body, UseGuards, Req, Get, Param } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { Request } from "express";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  CreateBookingInput_2024_08_13,
  CreateBookingInputPipe,
  CreateRecurringBookingInput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
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
    body:
      | CreateBookingInput_2024_08_13
      | RescheduleBookingInput_2024_08_13
      | CreateRecurringBookingInput_2024_08_13,
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
    const booking = await this.bookingsService.getBooking(bookingUid);

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }
}
