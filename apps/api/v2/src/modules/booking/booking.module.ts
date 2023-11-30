import { BookingController } from "@/modules/booking/booking.controller";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { BookingRepositoryModule } from "@/modules/repositories/booking/booking-repository.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, BookingRepositoryModule],
  controllers: [BookingController],
})
export class BookingModule {}
