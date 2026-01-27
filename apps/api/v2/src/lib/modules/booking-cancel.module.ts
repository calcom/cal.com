import { PrismaBookingAttendeeRepository } from "@/lib/repositories/prisma-booking-attendee.repository";
import { PrismaBookingReferenceRepository } from "@/lib/repositories/prisma-booking-reference.repository";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaProfileRepository } from "@/lib/repositories/prisma-profile.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";
import { BookingCancelService } from "@/lib/services/booking-cancel.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaBookingAttendeeRepository,
    PrismaBookingReferenceRepository,
    PrismaBookingRepository,
    PrismaProfileRepository,
    PrismaUserRepository,
    BookingCancelService,
  ],
  exports: [BookingCancelService],
})
export class BookingCancelModule {}
