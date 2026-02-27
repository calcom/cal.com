import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { prisma } from "@calcom/prisma";
import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";

import { BookingDetailsService } from "./BookingDetailsService";

/**
 * Integration tests for BookingDetailsService.getBookingDetails
 *
 * These tests verify that org/team admins can view booking details
 * for bookings made by team members using personal event types (no teamId).
 *
 * On main (before the fix), the access check (checkBookingAccessWithPBAC) returns false
 * for personal event type bookings when the viewer is not the owner/host — even if
 * they are an org/team admin. These tests fail on main, proving the bug.
 *
 * On the PR branch, getBookingDetails uses doesUserIdHaveAccessToBooking which
 * correctly checks org/team admin access for personal event type bookings.
 */

// Track all created resources for cleanup
const cleanup = {
  bookingIds: [] as number[],
  eventTypeIds: [] as number[],
  membershipIds: [] as number[],
  teamIds: [] as number[],
  userIds: [] as number[],
};

async function cleanupAll() {
  if (cleanup.bookingIds.length > 0) {
    await prisma.booking.deleteMany({ where: { id: { in: cleanup.bookingIds } } });
  }
  if (cleanup.eventTypeIds.length > 0) {
    await prisma.eventType.deleteMany({ where: { id: { in: cleanup.eventTypeIds } } });
  }
  if (cleanup.membershipIds.length > 0) {
    await prisma.membership.deleteMany({ where: { id: { in: cleanup.membershipIds } } });
  }
  if (cleanup.teamIds.length > 0) {
    await prisma.team.deleteMany({ where: { id: { in: cleanup.teamIds } } });
  }
  if (cleanup.userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } });
  }
}

describe("BookingDetailsService (Integration Tests)", () => {
  const timestamp = Date.now();

  // Users
  let bookingOwner: { id: number; email: string };
  let orgAdmin: { id: number };
  let teamAdmin: { id: number };
  let regularUser: { id: number };

  // Org and team
  let org: { id: number };
  let team: { id: number };

  // Booking with personal event type
  let personalEventType: { id: number };
  let personalBookingUid: string;

  beforeAll(async () => {
    // 1. Create users
    bookingOwner = await prisma.user.create({
      data: {
        email: `booking-owner-${timestamp}@test.com`,
        username: `booking-owner-${timestamp}`,
      },
      select: { id: true, email: true },
    });
    cleanup.userIds.push(bookingOwner.id);

    orgAdmin = await prisma.user.create({
      data: {
        email: `org-admin-${timestamp}@test.com`,
        username: `org-admin-${timestamp}`,
      },
      select: { id: true },
    });
    cleanup.userIds.push(orgAdmin.id);

    teamAdmin = await prisma.user.create({
      data: {
        email: `team-admin-${timestamp}@test.com`,
        username: `team-admin-${timestamp}`,
      },
      select: { id: true },
    });
    cleanup.userIds.push(teamAdmin.id);

    regularUser = await prisma.user.create({
      data: {
        email: `regular-user-${timestamp}@test.com`,
        username: `regular-user-${timestamp}`,
      },
      select: { id: true },
    });
    cleanup.userIds.push(regularUser.id);

    // 2. Create an organization (Team with isOrganization=true)
    org = await prisma.team.create({
      data: {
        name: `Test Org ${timestamp}`,
        slug: `test-org-${timestamp}`,
        isOrganization: true,
      },
      select: { id: true },
    });
    cleanup.teamIds.push(org.id);

    // 3. Create a team within the org
    team = await prisma.team.create({
      data: {
        name: `Test Team ${timestamp}`,
        slug: `test-team-${timestamp}`,
        parentId: org.id,
      },
      select: { id: true },
    });
    cleanup.teamIds.push(team.id);

    // 4. Set the booking owner as a member of both org and team
    await prisma.user.update({
      where: { id: bookingOwner.id },
      data: { organizationId: org.id },
    });

    const ownerOrgMembership = await prisma.membership.create({
      data: {
        userId: bookingOwner.id,
        teamId: org.id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    });
    cleanup.membershipIds.push(ownerOrgMembership.id);

    const ownerTeamMembership = await prisma.membership.create({
      data: {
        userId: bookingOwner.id,
        teamId: team.id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    });
    cleanup.membershipIds.push(ownerTeamMembership.id);

    // 5. Set the org admin as ADMIN of the org
    const orgAdminMembership = await prisma.membership.create({
      data: {
        userId: orgAdmin.id,
        teamId: org.id,
        role: MembershipRole.ADMIN,
        accepted: true,
      },
    });
    cleanup.membershipIds.push(orgAdminMembership.id);

    // 6. Set the team admin as ADMIN of the team (but NOT the org)
    const teamAdminMembership = await prisma.membership.create({
      data: {
        userId: teamAdmin.id,
        teamId: team.id,
        role: MembershipRole.ADMIN,
        accepted: true,
      },
    });
    cleanup.membershipIds.push(teamAdminMembership.id);

    // 7. Create a personal event type (no teamId) for the booking owner
    personalEventType = await prisma.eventType.create({
      data: {
        title: `Personal Event ${timestamp}`,
        slug: `personal-event-${timestamp}`,
        length: 30,
        userId: bookingOwner.id,
      },
      select: { id: true },
    });
    cleanup.eventTypeIds.push(personalEventType.id);

    // 8. Create a booking on the personal event type
    personalBookingUid = `personal-booking-${timestamp}`;
    const booking = await prisma.booking.create({
      data: {
        uid: personalBookingUid,
        userId: bookingOwner.id,
        eventTypeId: personalEventType.id,
        title: `Personal Booking ${timestamp}`,
        startTime: new Date("2026-03-01T10:00:00.000Z"),
        endTime: new Date("2026-03-01T10:30:00.000Z"),
        status: BookingStatus.ACCEPTED,
        attendees: {
          create: {
            email: "attendee@test.com",
            name: "Test Attendee",
            timeZone: "UTC",
          },
        },
      },
    });
    cleanup.bookingIds.push(booking.id);
  });

  afterAll(async () => {
    // Reset organizationId before deleting users
    await prisma.user.update({
      where: { id: bookingOwner.id },
      data: { organizationId: null },
    });
    await cleanupAll();
  });

  describe("getBookingDetails - personal event type bookings", () => {
    it("should allow the booking owner to view their own booking details", async () => {
      const service = new BookingDetailsService(prisma);

      const result = await service.getBookingDetails({
        userId: bookingOwner.id,
        bookingUid: personalBookingUid,
      });

      expect(result).toBeDefined();
      expect(result.rescheduledToBooking).toBeNull();
      expect(result.previousBooking).toBeNull();
    });

    it("should allow an org admin to view booking details for a team member's personal event type booking", async () => {
      const service = new BookingDetailsService(prisma);

      const result = await service.getBookingDetails({
        userId: orgAdmin.id,
        bookingUid: personalBookingUid,
      });

      expect(result).toBeDefined();
      expect(result.rescheduledToBooking).toBeNull();
      expect(result.previousBooking).toBeNull();
    });

    it("should allow a team admin to view booking details for a team member's personal event type booking", async () => {
      const service = new BookingDetailsService(prisma);

      const result = await service.getBookingDetails({
        userId: teamAdmin.id,
        bookingUid: personalBookingUid,
      });

      expect(result).toBeDefined();
      expect(result.rescheduledToBooking).toBeNull();
      expect(result.previousBooking).toBeNull();
    });

    it("should deny access to a non-admin user viewing another user's personal event type booking", async () => {
      const service = new BookingDetailsService(prisma);

      await expect(
        service.getBookingDetails({
          userId: regularUser.id,
          bookingUid: personalBookingUid,
        })
      ).rejects.toThrow("You do not have permission to view this booking");
    });

    it("should throw when booking does not exist", async () => {
      const service = new BookingDetailsService(prisma);

      await expect(
        service.getBookingDetails({
          userId: bookingOwner.id,
          bookingUid: "non-existent-booking-uid",
        })
      ).rejects.toThrow("You do not have permission to view this booking");
    });
  });
});
