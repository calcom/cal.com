import { BookingController } from "@/modules/booking/booking.controller";
import { BookingRepository } from "@/modules/booking/booking.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [BookingRepository],
  controllers: [BookingController],
})
export class BookingModule {}
