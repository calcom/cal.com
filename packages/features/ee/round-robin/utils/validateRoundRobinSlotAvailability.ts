import { DateTime } from "luxon";

import { HttpError } from "@calcom/lib/http-error";
import { prisma } from "@calcom/prisma";
import type { Host } from "@calcom/prisma/client";

export async function validateRoundRobinSlotAvailability(
  eventTypeId: number,
  startDate: DateTime,
  endDate: DateTime,
  hosts: Host[]
) {
  const fixedHosts = hosts.filter((host) => host.isFixed === true);
  const nonFixedHosts = hosts.filter((host) => host.isFixed === false);

  if (fixedHosts.length > 0) {
    await validateFixedHostsAvailability(eventTypeId, startDate, endDate, fixedHosts);
  } else {
    await validateNonFixedHostsAvailability(eventTypeId, startDate, endDate, nonFixedHosts);
  }
}

async function validateFixedHostsAvailability(
  eventTypeId: number,
  startDate: DateTime,
  endDate: DateTime,
  hosts: Host[]
) {
  const existingBooking = await prisma.booking.findFirst({
    where: {
      eventTypeId,
      startTime: startDate.toJSDate(),
      endTime: endDate.toJSDate(),
    },
    select: { attendees: true, userId: true, status: true },
  });
  const existingSlotReservation = await prisma.selectedSlots.count({
    where: {
      eventTypeId,
      slotUtcStartDate: startDate.toISO() ?? "",
      slotUtcEndDate: endDate.toISO() ?? "",
      // Only consider non-expired reservations
      releaseAt: { gt: DateTime.utc().toJSDate() },
    },
  });

  const hasHostAsAttendee = hosts.some(
    (host) =>
      existingBooking?.attendees.some((attendee) => attendee.id === host.userId) ||
      existingBooking?.userId === host.userId
  );

  if (existingSlotReservation > 0) {
    throw new HttpError({
      statusCode: 422,
      message: `Can't reserve the slot because the round robin event type has no available hosts left at this time slot.`,
    });
  }

  if (hasHostAsAttendee) {
    throw new HttpError({
      statusCode: 422,
      message: `Can't reserve a slot if the event is already booked.`,
    });
  }
}

async function validateNonFixedHostsAvailability(
  eventTypeId: number,
  startDate: DateTime,
  endDate: DateTime,
  hosts: Host[]
) {
  const existingSlotReservations = await prisma.selectedSlots.count({
    where: {
      eventTypeId,
      slotUtcStartDate: startDate.toISO() ?? "",
      slotUtcEndDate: endDate.toISO() ?? "",
      // Only consider non-expired reservations
      releaseAt: { gt: DateTime.utc().toJSDate() },
    },
  });

  if (existingSlotReservations === hosts.length) {
    throw new HttpError({
      statusCode: 422,
      message: `Can't reserve the slot because the round robin event type has no available hosts left at this time slot.`,
    });
  }
}
