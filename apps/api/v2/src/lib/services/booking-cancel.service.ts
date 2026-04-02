import { BookingCancelService as BaseBookingCancelService } from "@calcom/platform-libraries/bookings";
import { Injectable } from "@nestjs/common";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaBookingAttendeeRepository } from "@/lib/repositories/prisma-booking-attendee.repository";
import { PrismaBookingReferenceRepository } from "@/lib/repositories/prisma-booking-reference.repository";
import { PrismaProfileRepository } from "@/lib/repositories/prisma-profile.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";

@Injectable()
export class BookingCancelService extends BaseBookingCancelService {
  constructor(
    userRepository: PrismaUserRepository,
    bookingRepository: PrismaBookingRepository,
    profileRepository: PrismaProfileRepository,
    bookingReferenceRepository: PrismaBookingReferenceRepository,
    attendeeRepository: PrismaBookingAttendeeRepository
  ) {
    super({
      userRepository,
      bookingRepository,
      profileRepository,
      bookingReferenceRepository,
      attendeeRepository,
    });
  }
}
