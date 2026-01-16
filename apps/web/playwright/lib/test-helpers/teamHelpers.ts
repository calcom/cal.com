import { v4 as uuidv4 } from "uuid";

import { randomString } from "@calcom/lib/random";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

/**
 * Creates a team event type and assigns all team members as hosts
 * @param teamId - The team ID
 * @param eventType - Event type data to create
 * @returns The created event type
 */
export async function createRoundRobinTeamEventType({
  teamId,
  eventType,
}: {
  teamId: number;
  eventType: Prisma.EventTypeCreateInput;
}) {
  const createdEventType = await prisma.eventType.create({
    data: {
      ...eventType,
      team: {
        connect: {
          id: teamId,
        },
      },
    },
    include: {
      team: true,
    },
  });

  const teamMemberships = await prisma.membership.findMany({
    where: {
      teamId,
    },
  });

  // Add all team members as hosts (excluding the current user who's already added)
  for (const membership of teamMemberships) {
    await prisma.host.create({
      data: {
        userId: membership.userId,
        eventTypeId: createdEventType.id,
        isFixed: false, // ROUND_ROBIN scheduling type
      },
    });
  }

  return createdEventType;
}

export async function setupTeamAndBookingSeats(
  user: { id: number },
  booking: { uid: string; id: number },
  teamUser: { id: number },
  role: "ADMIN" | "MEMBER" | "OWNER"
) {
  const bookingWithEventType = await prisma.booking.findUnique({
    where: { uid: booking.uid },
    select: {
      id: true,
      eventTypeId: true,
    },
  });

  // Create a team and assign the event type to it
  const team = await prisma.team.create({
    data: {
      name: "Test Team",
      slug: `test-team-${randomString(10)}`,
    },
  });

  await prisma.eventType.update({
    where: { id: bookingWithEventType?.eventTypeId || -1 },
    data: {
      seatsShowAttendees: false,
      teamId: team.id,
    },
  });

  // Add team user with specified role
  await prisma.membership.create({
    data: {
      userId: teamUser.id,
      teamId: team.id,
      role: role,
      accepted: true,
    },
  });

  // Add original user as MEMBER only if they're different from teamUser
  if (user.id !== teamUser.id) {
    await prisma.membership.create({
      data: {
        userId: user.id,
        teamId: team.id,
        role: "MEMBER",
        accepted: true,
      },
    });
  }

  const bookingAttendees = await prisma.attendee.findMany({
    where: { bookingId: booking.id },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const bookingSeats = bookingAttendees.map((attendee) => ({
    bookingId: booking.id,
    attendeeId: attendee.id,
    referenceUid: uuidv4(),
    data: {
      responses: {
        name: attendee.name,
        email: attendee.email,
      },
    },
  }));

  await prisma.bookingSeat.createMany({
    data: bookingSeats,
  });

  return { team, bookingSeats };
}
