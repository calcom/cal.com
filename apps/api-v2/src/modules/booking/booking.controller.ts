import { CreateBookingDto } from "@/modules/booking/dtos/create-booking";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { BookingRepository } from "@/modules/repositories/booking/booking-repository.service";
import { Response } from "@/types";
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Res,
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
  async createBooking(@Res({ passthrough: true }) res: Response, @Body() body: CreateBookingDto) {
    const userId = res.locals.apiKey?.userId;

    this.logger.log(`Created Booking with data ${body}`);

    return this.bookingRepository.createBooking(userId, body);
  }
}
