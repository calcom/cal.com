import { Module } from "@nestjs/common";
import { InstantBookingCreateService } from "@/lib/services/instant-booking-create.service";

@Module({
  providers: [InstantBookingCreateService],
  exports: [InstantBookingCreateService],
})
export class InstantBookingModule {}
