import type { BookingAudit, Prisma } from "@calcom/prisma/client";
import type { PrismaClient } from "@calcom/prisma";

import type { IBookingAuditRepository } from "./IBookingAuditRepository";

type Dependencies = {
    prismaClient: PrismaClient;
}
export class PrismaBookingAuditRepository implements IBookingAuditRepository {
    constructor(private readonly deps: Dependencies) { }

    async create(bookingAudit: Prisma.BookingAuditCreateInput): Promise<BookingAudit> {
        return this.deps.prismaClient.bookingAudit.create({
            data: bookingAudit,
        });
    }
}

