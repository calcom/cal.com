import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { BookingCancelService as BaseBookingCancelService } from "@calcom/platform-libraries/bookings";
import {
  PrismaBookingRepository,
  PrismaBookingAttendeeRepository,
  PrismaProfileRepository,
  PrismaUserRepository,
  PrismaBookingReferenceRepository,
} from "@calcom/platform-libraries/repositories";

@Injectable()
export class BookingCancelService extends BaseBookingCancelService {
  constructor(prismaWriteService: PrismaWriteService) {
    const prisma = prismaWriteService.prisma;
    super({
      userRepository: new PrismaUserRepository(prisma),
      bookingRepository: new PrismaBookingRepository(prisma),
      profileRepository: new PrismaProfileRepository({ prismaClient: prisma }),
      bookingReferenceRepository: new PrismaBookingReferenceRepository({ prismaClient: prisma }),
      attendeeRepository: new PrismaBookingAttendeeRepository(prisma),
    });
  }
}
