import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";

import type { Prisma } from "@calcom/prisma/client";

export class BookingSeatRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
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
