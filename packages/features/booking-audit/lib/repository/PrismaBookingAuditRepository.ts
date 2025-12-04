import type { PrismaClient } from "@calcom/prisma";

import type { IBookingAuditRepository, BookingAuditCreateInput } from "./IBookingAuditRepository";

type Dependencies = {
    prismaClient: PrismaClient;
}
export class PrismaBookingAuditRepository implements IBookingAuditRepository {
    constructor(private readonly deps: Dependencies) { }

    async create(bookingAudit: BookingAuditCreateInput) {
        return this.deps.prismaClient.bookingAudit.create({
            data: {
                bookingUid: bookingAudit.bookingUid,
                actorId: bookingAudit.actorId,
                action: bookingAudit.action,
                type: bookingAudit.type,
                timestamp: bookingAudit.timestamp,
                data: bookingAudit.data === null ? undefined : bookingAudit.data,
            },
        });
    }
}

