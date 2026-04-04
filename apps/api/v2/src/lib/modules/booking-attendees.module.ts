import { BookingEventHandlerModule } from "@/lib/modules/booking-event-handler.module";
import { PrismaBookingAttendeeRepository } from "@/lib/repositories/prisma-booking-attendee.repository";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { BookingAttendeesRemoveService } from "@/lib/services/booking-attendees-remove.service";
import { BookingAttendeesService } from "@/lib/services/booking-attendees.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, BookingEventHandlerModule],
  providers: [
    PrismaBookingRepository,
    PrismaBookingAttendeeRepository,
    PrismaFeaturesRepository,
    BookingAttendeesRemoveService,
    BookingAttendeesService,
  ],
  exports: [BookingAttendeesService],
})
export class BookingAttendeesModule {}
