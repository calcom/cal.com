import { LuckyUserService as BaseLuckyUserService } from "@calcom/platform-libraries/bookings";
import { Injectable } from "@nestjs/common";
import { PrismaAttributeRepository } from "@/lib/repositories/prisma-attribute.repository";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaHostRepository } from "@/lib/repositories/prisma-host.repository";
import { PrismaOOORepository } from "@/lib/repositories/prisma-ooo.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";

@Injectable()
export class LuckyUserService extends BaseLuckyUserService {
  constructor(
    bookingRepository: PrismaBookingRepository,
    hostRepository: PrismaHostRepository,
    oooRepository: PrismaOOORepository,
    userRepository: PrismaUserRepository,
    attributeRepository: PrismaAttributeRepository
  ) {
    super({
      bookingRepository: bookingRepository,
      hostRepository: hostRepository,
      oooRepository: oooRepository,
      userRepository: userRepository,
      attributeRepository: attributeRepository,
    });
  }
}
