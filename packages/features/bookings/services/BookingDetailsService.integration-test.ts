import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";
import { BookingStatus, CreationSource, MembershipRole } from "@calcom/prisma/enums";

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

// Track resources for cleanup
const createdBookingIds: number[] = [];
const createdTeamIds: number[] = [];
const createdUserIds: number[] = [];

describe("BookingDetailsService (Integration Tests)", () => {
  const timestamp = Date.now();

  const userRepo = new UserRepository(prisma);
  const eventTypeRepo = new EventTypeRepository(prisma);
  const teamRepo = new TeamRepository(prisma);

  // Users
  let bookingOwnerId: number;
  let orgAdminId: number;
  let teamAdminId: number;
  let regularUserId: number;

  // Org and team
  let orgId: number;
  let teamId: number;

  // Booking
  let personalBookingUid: string;

  beforeAll(async () => {
    // 1. Create users via UserRepository
    const bookingOwner = await userRepo.create({
      email: `booking-owner-${timestamp}@test.com`,
      username: `booking-owner-${timestamp}`,
      organizationId: null,
      creationSource: CreationSource.WEBAPP,
      locked: false,
    });
    bookingOwnerId = bookingOwner.id;
    createdUserIds.push(bookingOwner.id);

    const orgAdmin = await userRepo.create({
      email: `org-admin-${timestamp}@test.com`,
      username: `org-admin-${timestamp}`,
      organizationId: null,
      creationSource: CreationSource.WEBAPP,
      locked: false,
    });
    orgAdminId = orgAdmin.id;
    createdUserIds.push(orgAdmin.id);

    const teamAdmin = await userRepo.create({
      email: `team-admin-${timestamp}@test.com`,
      username: `team-admin-${timestamp}`,
      organizationId: null,
      creationSource: CreationSource.WEBAPP,
      locked: false,
    });
    teamAdminId = teamAdmin.id;
    createdUserIds.push(teamAdmin.id);

    const regularUser = await userRepo.create({
      email: `regular-user-${timestamp}@test.com`,
      username: `regular-user-${timestamp}`,
      organizationId: null,
      creationSource: CreationSource.WEBAPP,
      locked: false,
    });
    regularUserId = regularUser.id;
    createdUserIds.push(regularUser.id);

    // 2. Create an organization (Team with isOrganization=true)
    // No TeamRepository.create() exists, so we use prisma directly
    const org = await prisma.team.create({
      data: {
        name: `Test Org ${timestamp}`,
        slug: `test-org-${timestamp}`,
        isOrganization: true,
      },
      select: { id: true },
    });
    orgId = org.id;
    createdTeamIds.push(org.id);

    // 3. Create a team within the org
    const team = await prisma.team.create({
      data: {
        name: `Test Team ${timestamp}`,
        slug: `test-team-${timestamp}`,
        parentId: org.id,
      },
      select: { id: true },
    });
    teamId = team.id;
    createdTeamIds.push(team.id);

    // 4. Set the booking owner's organizationId
    await prisma.user.update({
      where: { id: bookingOwnerId },
      data: { organizationId: orgId },
    });

    // 5. Create memberships via MembershipRepository
    await MembershipRepository.create({
      userId: bookingOwnerId,
      teamId: orgId,
      role: MembershipRole.MEMBER,
      accepted: true,
    });

    await MembershipRepository.create({
      userId: bookingOwnerId,
      teamId: teamId,
      role: MembershipRole.MEMBER,
      accepted: true,
    });

    await MembershipRepository.create({
      userId: orgAdminId,
      teamId: orgId,
      role: MembershipRole.ADMIN,
      accepted: true,
    });

    await MembershipRepository.create({
      userId: teamAdminId,
      teamId: teamId,
      role: MembershipRole.ADMIN,
      accepted: true,
    });

    // 6. Create a personal event type (no teamId) via EventTypeRepository
    const personalEventType = await eventTypeRepo.create({
      title: `Personal Event ${timestamp}`,
      slug: `personal-event-${timestamp}`,
      length: 30,
      userId: bookingOwnerId,
    });

    // 7. Create a booking on the personal event type
    // No generic BookingRepository.create() exists, so we use prisma directly
    personalBookingUid = `personal-booking-${timestamp}`;
    const booking = await prisma.booking.create({
      data: {
        uid: personalBookingUid,
        userId: bookingOwnerId,
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
    createdBookingIds.push(booking.id);
  });

  afterAll(async () => {
    // Clean up bookings and attendees
    if (createdBookingIds.length > 0) {
      await prisma.attendee.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
      await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
    }

    // Reset organizationId before deleting users/teams
    for (const userId of createdUserIds) {
      await prisma.user.update({
        where: { id: userId },
        data: { organizationId: null },
      });
    }

    // TeamRepository.deleteById handles memberships + managed event types cleanup
    for (const id of [...createdTeamIds].reverse()) {
      await teamRepo.deleteById({ id });
    }

    // Delete personal event types not associated with a team
    await prisma.eventType.deleteMany({
      where: { userId: { in: createdUserIds } },
    });

    // Delete user schedules created by UserRepository.create, then users
    for (const userId of createdUserIds) {
      await prisma.availability.deleteMany({
        where: { Schedule: { userId } },
      });
      await prisma.schedule.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
  });

  describe("getBookingDetails - personal event type bookings", () => {
    it("should allow the booking owner to view their own booking details", async () => {
      const service = new BookingDetailsService(prisma);

      const result = await service.getBookingDetails({
        userId: bookingOwnerId,
        bookingUid: personalBookingUid,
      });

      expect(result).toBeDefined();
      expect(result.rescheduledToBooking).toBeNull();
      expect(result.previousBooking).toBeNull();
    });

    it("should allow an org admin to view booking details for a team member's personal event type booking", async () => {
      const service = new BookingDetailsService(prisma);

      const result = await service.getBookingDetails({
        userId: orgAdminId,
        bookingUid: personalBookingUid,
      });

      expect(result).toBeDefined();
      expect(result.rescheduledToBooking).toBeNull();
      expect(result.previousBooking).toBeNull();
    });

    it("should allow a team admin to view booking details for a team member's personal event type booking", async () => {
      const service = new BookingDetailsService(prisma);

      const result = await service.getBookingDetails({
        userId: teamAdminId,
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
          userId: regularUserId,
          bookingUid: personalBookingUid,
        })
      ).rejects.toThrow("You do not have permission to view this booking");
    });

    it("should throw when booking does not exist", async () => {
      const service = new BookingDetailsService(prisma);

      await expect(
        service.getBookingDetails({
          userId: bookingOwnerId,
          bookingUid: "non-existent-booking-uid",
        })
      ).rejects.toThrow("You do not have permission to view this booking");
    });
  });
});
