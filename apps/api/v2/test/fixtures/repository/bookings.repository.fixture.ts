import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";
import { Booking, User } from "@prisma/client";

export class BookingsRepositoryFixture {
  private primaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.primaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async getById(bookingId: Booking["id"]) {
    return this.primaReadClient.booking.findFirst({ where: { id: bookingId } });
  }

  async deleteById(bookingId: Booking["id"]) {
    return this.prismaWriteClient.booking.delete({ where: { id: bookingId } });
  }

  async deleteAllBookings(userId: User["id"], userEmail: User["email"]) {
    return this.prismaWriteClient.booking.deleteMany({ where: { userId, userPrimaryEmail: userEmail } });
  }
}
