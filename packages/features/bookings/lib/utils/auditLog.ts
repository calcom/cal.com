import type { Prisma } from "@prisma/client";

import { PrismaBookingAuditRepository } from "@calcom/lib/server/repository/PrismaBookingAuditRepository";
import type { BookingAuditType, BookingAuditAction } from "@calcom/prisma/enums";

import type { Actor } from "../types/actor";
import { getActorUserId } from "../types/actor";

const auditRepository = new PrismaBookingAuditRepository();

export async function logBookingAudit({
  bookingId,
  actor,
  type,
  action,
  data,
}: {
  bookingId: string | number;
  actor?: Actor;
  type: BookingAuditType;
  action?: BookingAuditAction;
  data?: Prisma.InputJsonValue;
}): Promise<void> {
  const userId = getActorUserId(actor);

  await auditRepository.create({
    bookingId: String(bookingId),
    userId: userId ? String(userId) : null,
    type,
    action,
    data,
  });
}
