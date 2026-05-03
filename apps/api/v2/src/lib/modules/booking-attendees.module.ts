import { PrismaBookingAttendeeRepository } from "@/lib/repositories/prisma-booking-attendee.repository";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { BookingAttendeesRemoveService } from "@/lib/services/booking-attendees-remove.service";
import { BookingAttendeesService } from "@/lib/services/booking-attendees.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaBookingRepository,
    PrismaBookingAttendeeRepository,
    BookingAttendeesRemoveService,
    BookingAttendeesService,
  ],
  exports: [BookingAttendeesService],
})
export class BookingAttendeesModule {}
