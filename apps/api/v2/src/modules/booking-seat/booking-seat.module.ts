import { Module } from "@nestjs/common";
import { BookingSeatRepository } from "@/modules/booking-seat/booking-seat.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [BookingSeatRepository],
  exports: [BookingSeatRepository],
})
export class BookingSeatModule {}
