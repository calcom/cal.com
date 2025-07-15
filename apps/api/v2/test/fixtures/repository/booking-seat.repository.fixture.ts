import { PrismaReadService } from "@/modules/prisma/prismaReadService";
import { PrismaWriteService } from "@/modules/prisma/prismaWriteService";
import { TestingModule } from "@nestjs/testing";

import type { Prisma } from "@calcom/prisma/client";

export class BookingSeatRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async create(bookingSeat: Prisma.BookingSeatCreateInput) {
    return this.prismaWriteClient.bookingSeat.create({ data: bookingSeat });
  }

  async findAllByBookingId(bookingId: number) {
    return this.prismaReadClient.bookingSeat.findMany({ where: { bookingId } });
  }
}
