import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";

import type { Booking, User, Prisma } from "@calcom/prisma/client";

export class BookingsRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async getById(bookingId: Booking["id"]) {
    return this.prismaReadClient.booking.findFirst({ where: { id: bookingId } });
  }

  async getByUid(bookingUid: Booking["uid"]) {
    return this.prismaReadClient.booking.findUnique({ where: { uid: bookingUid } });
  }

  async getByRecurringBookingUid(recurringBookingUid: string) {
    return this.prismaReadClient.booking.findMany({
      where: {
        recurringEventId: recurringBookingUid,
      },
    });
  }

  async create(booking: Prisma.BookingCreateInput) {
    return this.prismaWriteClient.booking.create({ data: booking });
  }

  async deleteById(bookingId: Booking["id"]) {
    return this.prismaWriteClient.booking.deleteMany({ where: { id: bookingId } });
  }

  async deleteAllBookings(userId: User["id"], userEmail: User["email"]) {
    return this.prismaWriteClient.booking.deleteMany({ where: { userId, userPrimaryEmail: userEmail } });
  }
}
