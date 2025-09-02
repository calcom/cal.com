/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

type AuditLogContext = {
  type: string;
  wasRescheduled?: boolean;
  totalUpdates?: number;
  actor: { type: string; id?: number; email?: string };
  [key: string]: any;
};

export class BookingDeleteService {
  static async deleteBooking({
    bookingId,
    actor,
    wasRescheduled = false,
    totalUpdates = 0,
    additionalContext = {},
  }: {
    bookingId: number;
    actor: { type: string; id?: number; email?: string };
    wasRescheduled?: boolean;
    totalUpdates?: number;
    additionalContext?: Record<string, any>;
  }) {
    // Delete the booking (soft delete or update status as needed)
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
      select: { id: true },
    });

    // Create audit log entry
    const context: AuditLogContext = {
      ...additionalContext,
      type: "record_deleted",
      wasRescheduled,
      totalUpdates,
      actor,
    };

    await prisma.$transaction(async (tx) => {
      await (tx as any).auditlog.create({
        data: { entity: "booking", entityId: bookingId, action: "delete", context },
      });
    });

    return booking;
  }
}
