import { GetUser } from "@/modules/auth/decorator";
import type { CreateBookingInput } from "@/modules/booking/input/create-booking";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { BookingRepository } from "@/modules/repositories/booking/booking-repository.service";
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

@Controller("booking")
export class BookingController {
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
  async createBooking(@GetUser("id") userId: number, @Body() body: CreateBookingInput) {
    this.logger.log(`For user with id ${userId} created Booking with data ${JSON.stringify(body)}`);

    return this.bookingRepository.createBooking(userId, body);
  }
}
