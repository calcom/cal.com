import { generateOccurrencesFromRRule } from "@calid/features/modules/teams/lib/recurrenceUtil";

import { prisma, type PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { recurringEventSchema } from "@calcom/prisma/zod-utils";
import type { RecurringEvent } from "@calcom/types/Calendar";

export type CalIdContactSortBy = "name" | "email" | "createdAt" | "updatedAt";
export type CalIdContactSortDirection = "asc" | "desc";

const calIdContactSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  metadata: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CalIdContactSelect;

export type CalIdContactDTO = Prisma.CalIdContactGetPayload<{
  select: typeof calIdContactSelect;
}>;

export type CalIdContactListRowDTO = CalIdContactDTO & {
  lastMeetingAt: Date | null;
};

export type CalIdContactMeetingStatus = "upcoming" | "completed" | "cancelled";

export type CalIdContactMeetingDTO = {
  id: number;
  instanceId: string;
  title: string;
  date: Date;
  duration: number;
  status: CalIdContactMeetingStatus;
  meetingLink: string | null;
  notes: string | null;
};

const bookingMeetingSelect = {
  id: true,
  title: true,
  startTime: true,
  endTime: true,
  status: true,
  recurringEventId: true,
  location: true,
  metadata: true,
  references: {
    select: {
      type: true,
      meetingUrl: true,
    },
    orderBy: {
      id: "desc",
    },
  },
  internalNote: {
    select: {
      text: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
  },
} satisfies Prisma.BookingSelect;

export class CalIdContactRepository {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  private buildAttendeeMatchers({
    email,
    phone,
  }: {
    email: string;
    phone: string;
  }): Prisma.AttendeeWhereInput[] {
    const attendeeMatchers: Prisma.AttendeeWhereInput[] = [];
    const normalizedEmail = email.trim();
    const normalizedPhone = phone.trim();

    if (normalizedEmail.length > 0) {
      attendeeMatchers.push({
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      });
    }

    if (normalizedPhone.length > 0) {
      attendeeMatchers.push({
        phoneNumber: normalizedPhone,
      });
    }

    return attendeeMatchers;
  }

  async listByUserId({
    userId,
    search,
    sortBy,
    sortDirection,
    limit,
    offset,
  }: {
    userId: number;
    search?: string;
    sortBy: CalIdContactSortBy;
    sortDirection: CalIdContactSortDirection;
    limit: number;
    offset: number;
  }) {
    const normalizedSearch = search?.trim();

    const where: Prisma.CalIdContactWhereInput = {
      userId,
      ...(normalizedSearch
        ? {
            OR: [
              { name: { contains: normalizedSearch, mode: "insensitive" } },
              { email: { contains: normalizedSearch, mode: "insensitive" } },
              { phone: { contains: normalizedSearch, mode: "insensitive" } },
              { notes: { contains: normalizedSearch, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const primaryOrderBy: Prisma.CalIdContactOrderByWithRelationInput = {
      [sortBy]: sortDirection,
    };

    const [rows, totalRowCount] = await this.prismaClient.$transaction([
      this.prismaClient.calIdContact.findMany({
        where,
        select: calIdContactSelect,
        orderBy: [primaryOrderBy, { id: "desc" }],
        take: limit,
        skip: offset,
      }),
      this.prismaClient.calIdContact.count({ where }),
    ]);

    const now = new Date();

    const rowsWithLastMeeting: CalIdContactListRowDTO[] = await Promise.all(
      rows.map(async (row) => {
        const attendeeMatchers = this.buildAttendeeMatchers({
          email: row.email,
          phone: row.phone,
        });

        if (attendeeMatchers.length === 0) {
          return {
            ...row,
            lastMeetingAt: null,
          };
        }

        const lastMeeting = await this.prismaClient.booking.findFirst({
          where: {
            userId,
            endTime: {
              lt: now,
            },
            status: {
              notIn: [BookingStatus.CANCELLED, BookingStatus.REJECTED],
            },
            attendees: {
              some: {
                OR: attendeeMatchers,
              },
            },
          },
          select: {
            endTime: true,
          },
          orderBy: [{ endTime: "desc" }, { id: "desc" }],
        });

        return {
          ...row,
          lastMeetingAt: lastMeeting?.endTime ?? null,
        };
      })
    );

    return {
      rows: rowsWithLastMeeting,
      totalRowCount,
    };
  }

  async getById({ id, userId }: { id: number; userId: number }) {
    return this.prismaClient.calIdContact.findFirst({
      where: {
        id,
        userId,
      },
      select: calIdContactSelect,
    });
  }

  async create({
    userId,
    data,
  }: {
    userId: number;
    data: {
      name: string;
      email: string;
      phone: string;
      notes: string;
    };
  }) {
    return this.prismaClient.calIdContact.create({
      data: {
        userId,
        ...data,
      },
      select: calIdContactSelect,
    });
  }

  async updateById({
    id,
    userId,
    data,
  }: {
    id: number;
    userId: number;
    data: {
      name?: string;
      email?: string;
      phone?: string;
      notes?: string;
    };
  }) {
    const updated = await this.prismaClient.calIdContact.updateMany({
      where: {
        id,
        userId,
      },
      data,
    });

    if (!updated.count) {
      return null;
    }

    return this.getById({ id, userId });
  }

  async deleteById({ id, userId }: { id: number; userId: number }) {
    const deleted = await this.prismaClient.calIdContact.deleteMany({
      where: {
        id,
        userId,
      },
    });

    return deleted.count > 0;
  }

  async listMeetingsByContactId({
    contactId,
    userId,
    limit,
  }: {
    contactId: number;
    userId: number;
    limit: number;
  }) {
    const contact = await this.getById({ id: contactId, userId });

    if (!contact) {
      return null;
    }

    const attendeeMatchers = this.buildAttendeeMatchers({
      email: contact.email,
      phone: contact.phone,
    });

    if (attendeeMatchers.length === 0) {
      return {
        contact,
        rows: [],
      };
    }

    const now = Date.now();

    const bookings = await this.prismaClient.booking.findMany({
      where: {
        userId,
        attendees: {
          some: {
            OR: attendeeMatchers,
          },
        },
      },
      select: bookingMeetingSelect,
      orderBy: [{ startTime: "desc" }, { id: "desc" }],
    });

    const rows = bookings.flatMap<CalIdContactMeetingDTO>((booking) => {
      const startTime = booking.startTime;
      const endTime = booking.endTime;
      const duration = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 60000));
      const bookingStatus = String(booking.status).toLowerCase();

      const status: CalIdContactMeetingStatus =
        bookingStatus === "cancelled" || bookingStatus === "rejected"
          ? "cancelled"
          : endTime.getTime() >= now
          ? "upcoming"
          : "completed";

      const videoReference = booking.references.find(
        (reference) => reference.type.includes("_video") && Boolean(reference.meetingUrl)
      );
      const fallbackReference = booking.references.find((reference) => Boolean(reference.meetingUrl));
      const locationLink =
        typeof booking.location === "string" && booking.location.startsWith("http") ? booking.location : null;
      const meetingLink = videoReference?.meetingUrl ?? fallbackReference?.meetingUrl ?? locationLink ?? null;

      const meetingNoteFromMetadata =
        booking.metadata && typeof booking.metadata === "object" && !Array.isArray(booking.metadata)
          ? "meetingNote" in booking.metadata && typeof booking.metadata.meetingNote === "string"
            ? booking.metadata.meetingNote
            : null
          : null;
      const latestInternalNote = booking.internalNote[0]?.text ?? null;
      const notes = meetingNoteFromMetadata ?? latestInternalNote;

      const rawRecurringEvent =
        booking.recurringEventId === null &&
        booking.metadata &&
        typeof booking.metadata === "object" &&
        !Array.isArray(booking.metadata)
          ? "recurringEvent" in booking.metadata
            ? booking.metadata.recurringEvent
            : null
          : null;
      const parsedRecurringEvent = recurringEventSchema.safeParse(rawRecurringEvent);
      const recurringEvent =
        parsedRecurringEvent.success && booking.recurringEventId === null
          ? (parsedRecurringEvent.data as RecurringEvent)
          : null;

      const createMeetingRow = ({
        date,
        status,
        instanceSuffix,
      }: {
        date: Date;
        status: CalIdContactMeetingStatus;
        instanceSuffix: string;
      }): CalIdContactMeetingDTO => ({
        id: booking.id,
        instanceId: `${booking.id}:${instanceSuffix}`,
        title: booking.title,
        date,
        duration,
        status,
        meetingLink,
        notes,
      });

      if (recurringEvent) {
        const { occurrences, cancelledDates } = generateOccurrencesFromRRule(recurringEvent, startTime);
        const hasCancelledOrRejectedStatus = bookingStatus === "cancelled" || bookingStatus === "rejected";

        const occurrenceRows = occurrences.map((occurrenceDate) => {
          const occurrenceEndTime = new Date(occurrenceDate.getTime() + duration * 60000);
          const occurrenceStatus: CalIdContactMeetingStatus = hasCancelledOrRejectedStatus
            ? "cancelled"
            : occurrenceEndTime.getTime() >= now
            ? "upcoming"
            : "completed";

          return createMeetingRow({
            date: occurrenceDate,
            status: occurrenceStatus,
            instanceSuffix: occurrenceDate.toISOString(),
          });
        });

        const cancelledOccurrenceRows = cancelledDates.map((cancelledDate) =>
          createMeetingRow({
            date: cancelledDate,
            status: "cancelled",
            instanceSuffix: `cancelled:${cancelledDate.toISOString()}`,
          })
        );

        if (occurrenceRows.length > 0 || cancelledOccurrenceRows.length > 0) {
          return [...occurrenceRows, ...cancelledOccurrenceRows];
        }
      }

      return [
        createMeetingRow({
          date: startTime,
          status,
          instanceSuffix: startTime.toISOString(),
        }),
      ];
    });

    rows.sort((first, second) => {
      const timeDiff = second.date.getTime() - first.date.getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }
      return second.id - first.id;
    });

    return {
      contact,
      rows: rows.slice(0, limit),
    };
  }
}
