import { BookingsController } from "@/ee/bookings/controllers/bookings.controller";
import { Module } from "@nestjs/common";

@Module({
  imports: [],
  providers: [],
  controllers: [BookingsController],
})
export class BookingsModule {}
