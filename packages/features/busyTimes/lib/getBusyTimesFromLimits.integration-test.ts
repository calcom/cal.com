import dayjs from "@calcom/dayjs";
import { prisma } from "@calcom/prisma";
import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";
import type { EventBusyDetails } from "@calcom/types/Calendar";
import { afterEach, describe, expect, it } from "vitest";
import { getBusyTimesFromLimits, getBusyTimesFromTeamLimits } from "./getBusyTimesFromLimits";

type CreatedResources = {
  users: number[];
  eventTypes: number[];
  bookings: number[];
  teams: number[];
  memberships: number[];
};

const createdResources: CreatedResources = {
  users: [],
  eventTypes: [],
  bookings: [],
  teams: [],
  memberships: [],
};

const createTestUser = async (overrides?: { email?: string; username?: string }) => {
  const timestamp = `${Date.now()}-${Math.random()}`;
  const user = await prisma.user.create({
    data: {
      email: overrides?.email ?? `limits-test-${timestamp}@example.com`,
      username: overrides?.username ?? `limits-test-${timestamp}`,
    },
  });
  createdResources.users.push(user.id);
  return user;
};

const createTestTeam = async () => {
  const timestamp = `${Date.now()}-${Math.random()}`;
  const team = await prisma.team.create({
    data: {
      name: `Limits Test Team ${timestamp}`,
      slug: `limits-test-${timestamp}`,
    },
  });
  createdResources.teams.push(team.id);
  return team;
};

const createTestMembership = async (params: { userId: number; teamId: number; role?: MembershipRole }) => {
  const membership = await prisma.membership.create({
    data: {
      userId: params.userId,
      teamId: params.teamId,
      role: params.role ?? MembershipRole.MEMBER,
      accepted: true,
    },
  });
  createdResources.memberships.push(membership.id);
  return membership;
};

const createTestEventType = async (params: { userId: number; teamId?: number; length?: number }) => {
  const timestamp = `${Date.now()}-${Math.random()}`;
  const eventType = await prisma.eventType.create({
    data: {
      title: "Limits Test Event",
      slug: `limits-test-${timestamp}`,
      length: params.length ?? 60,
      userId: params.userId,
      teamId: params.teamId,
      users: {
        connect: { id: params.userId },
      },
    },
  });
  createdResources.eventTypes.push(eventType.id);
  return eventType;
};

const createTestBooking = async (params: {
  userId: number;
  eventTypeId: number;
  uid: string;
  startTime: Date;
  endTime: Date;
}) => {
  const booking = await prisma.booking.create({
    data: {
      userId: params.userId,
      eventTypeId: params.eventTypeId,
      uid: params.uid,
      status: BookingStatus.ACCEPTED,
      startTime: params.startTime,
      endTime: params.endTime,
      title: "Limits Test Booking",
    },
  });
  createdResources.bookings.push(booking.id);
  return booking;
};

afterEach(async () => {
  if (createdResources.bookings.length > 0) {
    await prisma.booking.deleteMany({
      where: { id: { in: createdResources.bookings } },
    });
    createdResources.bookings = [];
  }

  if (createdResources.eventTypes.length > 0) {
    await prisma.eventType.deleteMany({
      where: { id: { in: createdResources.eventTypes } },
    });
    createdResources.eventTypes = [];
  }

  if (createdResources.memberships.length > 0) {
    await prisma.membership.deleteMany({
      where: { id: { in: createdResources.memberships } },
    });
    createdResources.memberships = [];
  }

  if (createdResources.teams.length > 0) {
    await prisma.team.deleteMany({
      where: { id: { in: createdResources.teams } },
    });
    createdResources.teams = [];
  }

  if (createdResources.users.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdResources.users } },
    });
    createdResources.users = [];
  }
});

describe("getBusyTimesFromLimits source fields (integration)", () => {
  it("should return busy times with booking limit source when booking limit is reached", async () => {
    const dayStart = dayjs().add(1, "day").startOf("day");

    const mockBookings: EventBusyDetails[] = [
      {
        start: dayStart.set("hour", 9).toDate(),
        end: dayStart.set("hour", 10).toDate(),
        title: "Booking 1",
        source: "eventType-1-booking-1",
      },
      {
        start: dayStart.set("hour", 11).toDate(),
        end: dayStart.set("hour", 12).toDate(),
        title: "Booking 2",
        source: "eventType-1-booking-2",
      },
      {
        start: dayStart.set("hour", 14).toDate(),
        end: dayStart.set("hour", 15).toDate(),
        title: "Booking 3",
        source: "eventType-1-booking-3",
      },
    ];

    const mockEventType = {
      id: 1,
      length: 60,
      seatsPerTimeSlot: null,
      hosts: [],
      users: [],
    };

    const busyTimes = await getBusyTimesFromLimits(
      { PER_DAY: 3 },
      null,
      dayStart,
      dayStart.endOf("day"),
      60,
      mockEventType,
      mockBookings,
      "UTC"
    );

    expect(busyTimes.length).toBe(1);
    expect(busyTimes[0]).toMatchObject({
      title: "busy_time.event_booking_limit",
      source: "Event Booking Limit for User: 3 per day",
    });
  });

  it("should return busy times with duration limit source when duration limit is exceeded", async () => {
    const dayStart = dayjs().add(1, "day").startOf("day");

    const mockBookings: EventBusyDetails[] = [
      {
        start: dayStart.set("hour", 9).toDate(),
        end: dayStart.set("hour", 10).toDate(),
        title: "Booking 1",
        source: "eventType-1-booking-1",
      },
    ];

    const mockEventType = {
      id: 1,
      length: 30,
      seatsPerTimeSlot: null,
      hosts: [],
      users: [],
    };

    const busyTimes = await getBusyTimesFromLimits(
      null,
      { PER_DAY: 60 },
      dayStart,
      dayStart.endOf("day"),
      30,
      mockEventType,
      mockBookings,
      "UTC"
    );

    expect(busyTimes.length).toBe(1);
    expect(busyTimes[0]).toMatchObject({
      title: "busy_time.event_duration_limit",
      source: "Event Duration Limit for User: 60 minutes per day",
    });
  });

  it("should return empty array when no limits are exceeded", async () => {
    const dayStart = dayjs().add(1, "day").startOf("day");

    const mockEventType = {
      id: 1,
      length: 30,
      seatsPerTimeSlot: null,
      hosts: [],
      users: [],
    };

    const busyTimes = await getBusyTimesFromLimits(
      { PER_DAY: 10 },
      null,
      dayStart,
      dayStart.endOf("day"),
      30,
      mockEventType,
      [],
      "UTC"
    );

    expect(busyTimes.length).toBe(0);
  });
});

describe("getBusyTimesFromTeamLimits source fields (integration)", () => {
  it("should return busy times with team booking limit source", async () => {
    const user = await createTestUser();
    const team = await createTestTeam();
    await createTestMembership({ userId: user.id, teamId: team.id });
    const eventType = await createTestEventType({ userId: user.id, teamId: team.id });

    const dayStart = dayjs().add(1, "day").startOf("day");

    await createTestBooking({
      userId: user.id,
      eventTypeId: eventType.id,
      uid: `limits-team-${Date.now()}-1`,
      startTime: dayStart.set("hour", 9).toDate(),
      endTime: dayStart.set("hour", 10).toDate(),
    });

    const busyTimes = await getBusyTimesFromTeamLimits(
      { id: user.id, email: user.email },
      { PER_DAY: 1 },
      dayStart,
      dayStart.endOf("day"),
      team.id,
      false,
      "UTC"
    );

    expect(busyTimes.length).toBe(1);
    expect(busyTimes[0]).toMatchObject({
      title: "busy_time.team_booking_limit",
      source: "Team Booking Limit: 1 per day",
    });
  });
});
