import { BookingSeatRepository } from "@/modules/booking-seat/booking-seat.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [BookingSeatRepository],
  exports: [BookingSeatRepository],
})
export class BookingSeatModule {}
