import { PrismaModule } from "@/modules/prisma/prisma.module";
import { BookingRepository } from "@/modules/repositories/booking/booking-repository.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [BookingRepository],
  exports: [BookingRepository],
})
export class BookingRepositoryModule {}
