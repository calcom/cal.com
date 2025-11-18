import type { PrismaClient } from "@calcom/prisma";

import type { IBookingAuditRepository, BookingAuditCreateInput, BookingAuditWithActor } from "./IBookingAuditRepository";

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

    async findAllForBooking(bookingUid: string): Promise<BookingAuditWithActor[]> {
        return this.deps.prismaClient.bookingAudit.findMany({
            where: {
                OR: [
                    { bookingUid: bookingUid },
                    { linkedBookingUid: bookingUid }
                ]
            },
            include: {
                actor: {
                    select: {
                        id: true,
                        type: true,
                        userUuid: true,
                        attendeeId: true,
                        email: true,
                        phone: true,
                        name: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: {
                timestamp: "desc",
            },
        }) as Promise<BookingAuditWithActor[]>;
    }
}
