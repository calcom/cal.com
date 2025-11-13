import type { BookingAudit, Prisma } from "@calcom/prisma/client";
import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";

import type { IBookingAuditRepository } from "./IBookingAuditRepository";

export class PrismaBookingAuditRepository implements IBookingAuditRepository {
    constructor(private readonly prismaClient: PrismaClient = prisma) { }

    async create(bookingAudit: Prisma.BookingAuditCreateInput): Promise<BookingAudit> {
        // Validation is now handled by individual action services via their parse() methods
        // before data reaches the repository
        return this.prismaClient.bookingAudit.create({
            data: bookingAudit,
        });
    }
}

