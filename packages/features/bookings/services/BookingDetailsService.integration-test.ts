import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { OrganizationRepository } from "@calcom/features/ee/organizations/repositories/OrganizationRepository";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";
import { BookingStatus, CreationSource, MembershipRole } from "@calcom/prisma/enums";

import { BookingDetailsService } from "./BookingDetailsService";
import { TestBookingRepository } from "./test/TestBookingRepository";
import { TestEventTypeRepository } from "./test/TestEventTypeRepository";
import { TestTeamRepository } from "./test/TestTeamRepository";
import { TestUserRepository } from "./test/TestUserRepository";

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

// Track resource IDs for cleanup
const createdBookingIds: number[] = [];
const createdTeamIds: number[] = [];
const createdUserIds: number[] = [];

describe("BookingDetailsService (Integration Tests)", () => {
  const timestamp = Date.now();

  // Production repositories
  const orgRepo = new OrganizationRepository({ prismaClient: prisma });
  const bookingRepo = new BookingRepository(prisma);
  const userRepo = new UserRepository(prisma);
  const eventTypeRepo = new EventTypeRepository(prisma);
  const teamRepo = new TeamRepository(prisma);

  // Test-only repositories (for cleanup and team creation where no production method exists)
  const testTeamRepo = new TestTeamRepository(prisma);
  const testBookingRepo = new TestBookingRepository(prisma);
  const testUserRepo = new TestUserRepository(prisma);
  const testEventTypeRepo = new TestEventTypeRepository(prisma);

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
    // 1. Create an organization via OrganizationRepository
    const org = await orgRepo.create({
      name: `Test Org ${timestamp}`,
      slug: `test-org-${timestamp}`,
      isOrganizationConfigured: true,
      isOrganizationAdminReviewed: true,
      autoAcceptEmail: `test-${timestamp}.com`,
      seats: null,
      pricePerSeat: null,
      isPlatform: false,
      logoUrl: null,
      bio: null,
      brandColor: null,
      bannerUrl: null,
    });
    orgId = org.id;
    createdTeamIds.push(org.id);

    // 2. Create a team within the org via TestTeamRepository
    //    (no production TeamRepository.create() method exists)
    const team = await testTeamRepo.create({
      name: `Test Team ${timestamp}`,
      slug: `test-team-${timestamp}`,
      parentId: org.id,
    });
    teamId = team.id;
    createdTeamIds.push(team.id);

    // 3. Create booking owner WITH organizationId via UserRepository
    //    (eliminates need for separate updateOrganizationId call)
    const bookingOwner = await userRepo.create({
      email: `booking-owner-${timestamp}@test.com`,
      username: `booking-owner-${timestamp}`,
      organizationId: orgId,
      creationSource: CreationSource.WEBAPP,
      locked: false,
    });
    bookingOwnerId = bookingOwner.id;
    createdUserIds.push(bookingOwner.id);

    // 4. Create other users via UserRepository
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

    // 5. Create memberships via MembershipRepository (static method)
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

    // 7. Create a booking on the personal event type via BookingRepository
    personalBookingUid = `personal-booking-${timestamp}`;
    const booking = await bookingRepo.createBookingForManagedEventReassignment({
      uid: personalBookingUid,
      userId: bookingOwnerId,
      userPrimaryEmail: `booking-owner-${timestamp}@test.com`,
      eventTypeId: personalEventType.id,
      title: `Personal Booking ${timestamp}`,
      description: null,
      startTime: new Date("2026-03-01T10:00:00.000Z"),
      endTime: new Date("2026-03-01T10:30:00.000Z"),
      status: BookingStatus.ACCEPTED,
      location: null,
      smsReminderNumber: null,
      idempotencyKey: `idempotency-${timestamp}`,
      iCalUID: `ical-${timestamp}@test.com`,
      iCalSequence: 0,
      attendees: [{ email: "attendee@test.com", name: "Test Attendee", timeZone: "UTC", locale: "en" }],
    });
    createdBookingIds.push(booking.id);
  });

  afterAll(async () => {
    // Clean up bookings and attendees via TestBookingRepository
    await testBookingRepo.deleteMany(createdBookingIds);

    // Delete personal event types not associated with a team via TestEventTypeRepository
    await testEventTypeRepo.deleteManyByUserIds(createdUserIds);

    // Delete users (handles memberships, profiles, schedules, availability) via TestUserRepository
    // Must happen before team deletion so user.organizationId FK is removed
    await testUserRepo.deleteMany(createdUserIds);

    // TeamRepository.deleteById handles remaining memberships + managed event types
    for (const id of [...createdTeamIds].reverse()) {
      await teamRepo.deleteById({ id });
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
