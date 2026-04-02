import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingAuditContextSchema } from "../dto/types";
import type {
  BookingAuditCreateInput,
  BookingAuditWithActor,
  IBookingAuditRepository,
} from "./IBookingAuditRepository";

type Dependencies = {
  prismaClient: PrismaClient;
};

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
  context: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class PrismaBookingAuditRepository implements IBookingAuditRepository {
  constructor(private readonly deps: Dependencies) {}

  private parsed<T extends { context: Prisma.JsonValue }>(auditLog: T) {
    return {
      ...auditLog,
      context: auditLog.context ? BookingAuditContextSchema.parse(auditLog.context) : null,
    };
  }

  async create(bookingAudit: BookingAuditCreateInput) {
    const created = await this.deps.prismaClient.bookingAudit.create({
      data: {
        bookingUid: bookingAudit.bookingUid,
        actorId: bookingAudit.actorId,
        action: bookingAudit.action,
        type: bookingAudit.type,
        timestamp: bookingAudit.timestamp,
        source: bookingAudit.source,
        operationId: bookingAudit.operationId,
        data: bookingAudit.data === null ? undefined : bookingAudit.data,
        context: bookingAudit.context ?? undefined,
      },
    });

    return this.parsed(created);
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
        context: bookingAudit.context === undefined ? undefined : bookingAudit.context,
      })),
    });
    return { count: result.count };
  }

  async findAllForBooking(bookingUid: string): Promise<BookingAuditWithActor[]> {
    const results = await this.deps.prismaClient.bookingAudit.findMany({
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

    return results.map(this.parsed);
  }

  async findRescheduledLogsOfBooking(bookingUid: string): Promise<BookingAuditWithActor[]> {
    const results = await this.deps.prismaClient.bookingAudit.findMany({
      where: {
        bookingUid,
        action: "RESCHEDULED",
      },
      select: {
        ...safeBookingAuditSelect,
        actor: {
          select: safeActorSelect,
        },
      },
      orderBy: { timestamp: "desc" },
    });

    return results.map(this.parsed);
  }
}
