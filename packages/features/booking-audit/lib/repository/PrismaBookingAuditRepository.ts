import type { PrismaClient } from "@calcom/prisma";

import type { IBookingAuditRepository, BookingAuditCreateInput } from "./IBookingAuditRepository";

type Dependencies = {
    prismaClient: PrismaClient;
}
export class PrismaBookingAuditRepository implements IBookingAuditRepository {
    constructor(private readonly deps: Dependencies) { }

    async create(bookingAudit: BookingAuditCreateInput) {
        return this.deps.prismaClient.bookingAudit.create({
            data: bookingAudit,
        });
    }
}

