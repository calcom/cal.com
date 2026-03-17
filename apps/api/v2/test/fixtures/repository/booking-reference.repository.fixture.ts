import type { Booking, BookingReference, Prisma } from "@calcom/prisma/client";
import { TestingModule } from "@nestjs/testing";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

export class BookingReferenceRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async getById(id: BookingReference["id"]) {
    return this.prismaReadClient.bookingReference.findFirst({ where: { id } });
  }

  async getByBookingId(bookingId: Booking["id"]) {
    return this.prismaReadClient.bookingReference.findMany({ where: { bookingId } });
  }

  async create(bookingReference: Prisma.BookingReferenceCreateInput) {
    return this.prismaWriteClient.bookingReference.create({ data: bookingReference });
  }

  async deleteById(id: BookingReference["id"]) {
    return this.prismaWriteClient.bookingReference.deleteMany({ where: { id } });
  }

  async deleteByBookingId(bookingId: Booking["id"]) {
    return this.prismaWriteClient.bookingReference.deleteMany({ where: { bookingId } });
  }
}
