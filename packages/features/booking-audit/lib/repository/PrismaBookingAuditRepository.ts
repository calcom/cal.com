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
    credentialId: true,
    name: true,
    createdAt: true,
} as const;

const safeBookingAuditSelect = {
    id: true,
    bookingUid: true,
    actorId: true,
    action: true,
    type: true,
    timestamp: true,
    source: true,
    operationId: true,
    data: true,
    createdAt: true,
    updatedAt: true,
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
                source: bookingAudit.source,
                operationId: bookingAudit.operationId,
                data: bookingAudit.data === null ? undefined : bookingAudit.data,
            },
        });
    }

    async createMany(bookingAudits: BookingAuditCreateInput[]) {
        const result = await this.deps.prismaClient.bookingAudit.createMany({
            data: bookingAudits.map((bookingAudit) => ({
                bookingUid: bookingAudit.bookingUid,
                actorId: bookingAudit.actorId,
                action: bookingAudit.action,
                type: bookingAudit.type,
                timestamp: bookingAudit.timestamp,
                source: bookingAudit.source,
                operationId: bookingAudit.operationId,
                data: bookingAudit.data === null ? undefined : bookingAudit.data,
            })),
        });
        return { count: result.count };
    }

    async findAllForBooking(bookingUid: string): Promise<BookingAuditWithActor[]> {
        return this.deps.prismaClient.bookingAudit.findMany({
            where: {
                bookingUid,
            },
            select: {
                ...safeBookingAuditSelect,
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
            select: {
                ...safeBookingAuditSelect,
                actor: {
                    select: safeActorSelect
                },
            },
            orderBy: { timestamp: "desc" },
        });
    }
}

