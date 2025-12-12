import { RegularBookingModule } from "@/lib/modules/regular-booking.module";
import { RecurringBookingService } from "@/lib/services/recurring-booking.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [RegularBookingModule, PrismaModule],
  providers: [RecurringBookingService],
  exports: [RecurringBookingService],
})
export class RecurringBookingModule {}
