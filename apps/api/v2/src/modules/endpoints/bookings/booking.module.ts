import { BookingRepository } from "@/modules/endpoints/bookings/booking.repository";
import { BookingsController } from "@/modules/endpoints/bookings/controllers/bookings/bookings.controller";
import { PrismaModule } from "@/modules/services/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [BookingRepository],
  controllers: [BookingsController],
})
export class BookingModule {}
