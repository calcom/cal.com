import { InstantBookingCreateService } from "@/lib/services/instant-booking-create.service";
import { Module } from "@nestjs/common";

@Module({
  providers: [InstantBookingCreateService],
  exports: [InstantBookingCreateService],
})
export class InstantBookingModule {}
