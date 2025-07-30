import type { BookingAudit, Prisma } from "@prisma/client";

import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";

import type { IBookingAuditRepository } from "./IBookingAuditRepository";

export class PrismaBookingAuditRepository implements IBookingAuditRepository {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async create(bookingAudit: Prisma.BookingAuditCreateInput): Promise<BookingAudit> {
    return this.prismaClient.bookingAudit.create({
      data: bookingAudit,
    });
  }
}
