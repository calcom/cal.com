import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { BookingCancelService as BaseBookingCancelService } from "@calcom/features/bookings/lib/handleCancelBooking";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { PrismaBookingAttendeeRepository } from "@calcom/features/bookings/repositories/PrismaBookingAttendeeRepository";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { BookingReferenceRepository } from "@calcom/lib/server/repository/bookingReference";

@Injectable()
export class BookingCancelService extends BaseBookingCancelService {
  constructor(prismaWriteService: PrismaWriteService) {
    const prisma = prismaWriteService.prisma;
    super({
      userRepository: new UserRepository(prisma),
      bookingRepository: new BookingRepository(prisma),
      profileRepository: new ProfileRepository({ prismaClient: prisma }),
      bookingReferenceRepository: new BookingReferenceRepository({ prismaClient: prisma }),
      attendeeRepository: new PrismaBookingAttendeeRepository(prisma),
    });
  }
}
