import type { PrismaClient } from "@calcom/prisma";

import type { IBookingAuditRepository, BookingAuditCreateInput, BookingAuditWithActor } from "./IBookingAuditRepository";

type Dependencies = {
    prismaClient: PrismaClient;
}

/**
 * Safe actor fields to expose in audit logs
 * Excludes PII fields like email and phone that aren't needed for display
 */
const safeActorSelect = {
    id: true,
    type: true,
    userUuid: true,
    attendeeId: true,
    name: true,
    createdAt: true,
} as const;

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
                bookingUid,
            },
            include: {
                actor: {
                    select: safeActorSelect,
                },
            },
            orderBy: {
                timestamp: "desc",
            },
        });
    }

    async findRescheduledLogsOfBooking(bookingUid: string): Promise<BookingAuditWithActor[]> {
        return this.deps.prismaClient.bookingAudit.findMany({
            where: {
                bookingUid,
                action: "RESCHEDULED",
            },
            include: {
                actor: {
                    select: safeActorSelect,
                },
            },
            orderBy: {
                timestamp: "desc",
            },
        });
    }
}

