import { RegularBookingModule } from "@/lib/modules/regular-booking.module";
import { RecurringBookingService } from "@/lib/services/recurring-booking.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [RegularBookingModule],
  providers: [RecurringBookingService],
  exports: [RecurringBookingService],
})
export class RecurringBookingModule {}
