import { randomUUID } from "node:crypto";

import { prisma } from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ActiveUserBillingRepository } from "../repositories/ActiveUserBillingRepository";
import { ActiveUserBillingService } from "./ActiveUserBillingService";

const TEST_PREFIX = `aub-int-${Date.now()}`;

let org: Team;
let users: User[] = [];
let service: ActiveUserBillingService;

const periodStart = new Date("2026-01-01T00:00:00Z");
const periodEnd = new Date("2026-02-01T00:00:00Z");

async function createUser(suffix: string): Promise<User> {
  const user = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}-${suffix}@example.com`,
      username: `${TEST_PREFIX}-${suffix}`,
      name: `Test ${suffix}`,
    },
  });
  users.push(user);
  return user;
}

async function createBookingForHost(
  host: User,
  startTime: Date,
  endTime: Date,
  attendeeEmail?: string
): Promise<number> {
  const booking = await prisma.booking.create({
    data: {
      uid: randomUUID(),
      title: `Booking by ${host.name}`,
      startTime,
      endTime,
      userId: host.id,
      status: BookingStatus.ACCEPTED,
    },
  });

  if (attendeeEmail) {
    await prisma.attendee.create({
      data: {
        email: attendeeEmail,
        name: "Attendee",
        timeZone: "UTC",
        bookingId: booking.id,
      },
    });
  }

  return booking.id;
}

describe("ActiveUserBillingService Integration", () => {
  const bookingIds: number[] = [];

  beforeAll(async () => {
    const repo = new ActiveUserBillingRepository(prisma);
    service = new ActiveUserBillingService({
      activeUserBillingRepository: repo,
    });

    org = await prisma.team.create({
      data: {
        name: `${TEST_PREFIX} Org`,
        slug: TEST_PREFIX,
        isOrganization: true,
      },
    });

    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const charlie = await createUser("charlie");
    const inactive = await createUser("inactive");

    for (const user of [alice, bob, charlie, inactive]) {
      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });
    }

    // Alice hosts a booking inside the period
    const id1 = await createBookingForHost(
      alice,
      new Date("2026-01-10T10:00:00Z"),
      new Date("2026-01-10T11:00:00Z")
    );
    bookingIds.push(id1);

    // Bob hosts a booking inside the period, with Charlie as attendee
    const id2 = await createBookingForHost(
      bob,
      new Date("2026-01-15T14:00:00Z"),
      new Date("2026-01-15T15:00:00Z"),
      charlie.email
    );
    bookingIds.push(id2);

    // Inactive user has a booking OUTSIDE the period (before)
    const id3 = await createBookingForHost(
      inactive,
      new Date("2025-12-20T10:00:00Z"),
      new Date("2025-12-20T11:00:00Z")
    );
    bookingIds.push(id3);
  });

  afterAll(async () => {
    await prisma.attendee.deleteMany({
      where: { bookingId: { in: bookingIds } },
    });
    await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
    await prisma.membership.deleteMany({ where: { teamId: org.id } });
    await prisma.team.delete({ where: { id: org.id } });
    for (const user of users) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    }
  });

  it("counts hosts and attendees as active, excludes inactive members", async () => {
    const count = await service.getActiveUserCountForOrg(
      org.id,
      periodStart,
      periodEnd
    );

    // alice: host, bob: host, charlie: attendee of bob's booking
    // inactive: booking is outside the period
    expect(count).toBe(3);
  });

  it("returns 0 when period has no bookings", async () => {
    const emptyStart = new Date("2027-01-01T00:00:00Z");
    const emptyEnd = new Date("2027-02-01T00:00:00Z");

    const count = await service.getActiveUserCountForOrg(
      org.id,
      emptyStart,
      emptyEnd
    );

    expect(count).toBe(0);
  });

  it("does not double-count a user who is both host and attendee", async () => {
    // Alice hosts a booking where Bob is attendee -- Bob is already a host too
    const id = await createBookingForHost(
      users[0], // alice
      new Date("2026-01-20T09:00:00Z"),
      new Date("2026-01-20T10:00:00Z"),
      users[1].email // bob as attendee
    );
    bookingIds.push(id);

    const count = await service.getActiveUserCountForOrg(
      org.id,
      periodStart,
      periodEnd
    );

    // Still 3: alice (host), bob (host + attendee but counted once), charlie (attendee)
    expect(count).toBe(3);
  });

  it("includes bookings right at period boundaries", async () => {
    // Booking starting exactly at periodStart
    const id = await createBookingForHost(
      users[3], // inactive user
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-01-01T01:00:00Z")
    );
    bookingIds.push(id);

    const count = await service.getActiveUserCountForOrg(
      org.id,
      periodStart,
      periodEnd
    );

    // Now all 4 are active
    expect(count).toBe(4);
  });
});
