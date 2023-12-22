import { BookingRepository } from "@/modules/bookings/booking.repository";
import { BookingsController } from "@/modules/bookings/controllers/bookings/bookings.controller";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [BookingRepository],
  controllers: [BookingsController],
})
export class BookingModule {}
