import { BookingCancelService } from "@/lib/services/booking-cancel.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [BookingCancelService],
  exports: [BookingCancelService],
})
export class BookingCancelModule {}
