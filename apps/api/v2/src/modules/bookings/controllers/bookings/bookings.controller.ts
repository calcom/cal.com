import { GetUser } from "@/modules/auth/decorators";
import { BookingRepository } from "@/modules/bookings/booking.repository";
import { CreateBookingInput } from "@/modules/bookings/inputs/create-booking.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
  VERSION_NEUTRAL,
  Version,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Booking } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller("booking")
export class BookingsController {
  private readonly logger = new Logger("BookingController");

  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService,
    private readonly bookingRepository: BookingRepository
  ) {}

  @Post("/")
  @Version(VERSION_NEUTRAL)
  @UseGuards(AuthGuard("api-key"))
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @GetUser("id") userId: number,
    @Body() body: CreateBookingInput
  ): Promise<ApiResponse<Booking>> {
    this.logger.log(`For user with id ${userId} created Booking with data ${JSON.stringify(body)}`);
    return { status: SUCCESS_STATUS, data: await this.bookingRepository.createBooking(userId, body) };
  }
}
