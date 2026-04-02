import { Module } from "@nestjs/common";
import { BookingEventHandlerModule } from "@/lib/modules/booking-event-handler.module";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaBookingAttendeeRepository } from "@/lib/repositories/prisma-booking-attendee.repository";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { BookingAttendeesService } from "@/lib/services/booking-attendees.service";
import { BookingAttendeesRemoveService } from "@/lib/services/booking-attendees-remove.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";

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
