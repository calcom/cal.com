import { BookingSeatRepository } from "@/modules/booking-seat/bookingSeatRepository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [BookingSeatRepository],
  exports: [BookingSeatRepository],
})
export class BookingSeatModule {}
