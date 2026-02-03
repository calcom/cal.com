import { PrismaBookingAttendeeRepository } from "@/lib/repositories/prisma-booking-attendee.repository";
import { PrismaBookingReferenceRepository } from "@/lib/repositories/prisma-booking-reference.repository";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaProfileRepository } from "@/lib/repositories/prisma-profile.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";
import { Injectable } from "@nestjs/common";

import { BookingCancelService as BaseBookingCancelService } from "@calcom/platform-libraries/bookings";

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
