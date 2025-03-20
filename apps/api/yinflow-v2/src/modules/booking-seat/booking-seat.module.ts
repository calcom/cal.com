import { Module } from "@nestjs/common";

import { BookingSeatRepository } from "../booking-seat/booking-seat.repository";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [BookingSeatRepository],
  exports: [BookingSeatRepository],
})
export class BookingSeatModule {}
