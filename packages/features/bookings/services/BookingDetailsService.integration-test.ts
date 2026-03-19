import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { OrganizationRepository } from "@calcom/features/ee/organizations/repositories/OrganizationRepository";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { PrismaMembershipRepository } from "@calcom/features/membership/repositories/PrismaMembershipRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { randomString } from "@calcom/lib/random";
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

// Track resource IDs for cleanup
const createdBookingIds: number[] = [];
const createdTeamIds: number[] = [];
const createdUserIds: number[] = [];

describe("BookingDetailsService (Integration Tests)", () => {
  const timestamp = Date.now();

  const orgRepo = new OrganizationRepository({ prismaClient: prisma });
  const bookingRepo = new BookingRepository(prisma);
  const userRepo = new UserRepository(prisma);
  const eventTypeRepo = new EventTypeRepository(prisma);
  const teamRepo = new TeamRepository(prisma);
  const membershipRepo = new PrismaMembershipRepository(prisma);

  // Users
  let bookingOwnerId: number;
  let orgAdminId: number;
  let teamAdminId: number;
  let regularUserId: number;

  // Org and team
  let orgId: number;
  let teamId: number;

  // Booking and event type
  let personalBookingUid: string;
  let personalEventTypeId: number;

  let bookingTimeOffset = 0;

  async function createTestBooking(
    overrides?: {
      rescheduled?: boolean;
      fromReschedule?: string | null;
    }
  ) {
    const offset = bookingTimeOffset++;
    const booking = await prisma.booking.create({
      data: {
        uid: `booking-uid-${randomString()}`,
        title: "Details Service Test Booking",
        startTime: new Date(`2025-06-01T${String(10 + offset).padStart(2, "0")}:00:00.000Z`),
        endTime: new Date(`2025-06-01T${String(11 + offset).padStart(2, "0")}:00:00.000Z`),
        userId: bookingOwnerId,
        eventTypeId: personalEventTypeId,
        status: BookingStatus.ACCEPTED,
        rescheduled: overrides?.rescheduled ?? false,
        fromReschedule: overrides?.fromReschedule ?? null,
      },
    });
    createdBookingIds.push(booking.id);
    return booking;
  }

  async function cleanupBookings() {
    if (createdBookingIds.length > 0) {
      await prisma.tracking.deleteMany({
        where: { bookingId: { in: createdBookingIds } },
      });
      await prisma.attendee.deleteMany({
        where: { bookingId: { in: createdBookingIds } },
      });
      await prisma.booking.deleteMany({
        where: { id: { in: createdBookingIds } },
      });
      createdBookingIds.length = 0;
    }
  }

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

    // 2. Create a team within the org
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

    // 3. Create booking owner WITH organizationId via UserRepository
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

    // 5. Create memberships via MembershipRepository
    await membershipRepo.create({
      userId: bookingOwnerId,
      teamId: orgId,
      role: MembershipRole.MEMBER,
      accepted: true,
    });

    await membershipRepo.create({
      userId: bookingOwnerId,
      teamId: teamId,
      role: MembershipRole.MEMBER,
      accepted: true,
    });

    await membershipRepo.create({
      userId: orgAdminId,
      teamId: orgId,
      role: MembershipRole.ADMIN,
      accepted: true,
    });

    await membershipRepo.create({
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
    personalEventTypeId = personalEventType.id;

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
    await cleanupBookings();

    // Delete personal event types not associated with a team
    if (createdUserIds.length > 0) {
      await prisma.eventType.deleteMany({ where: { userId: { in: createdUserIds } } });
    }

    // Delete users (memberships, profiles, schedules, availability)
    if (createdUserIds.length > 0) {
      await prisma.membership.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.profile.deleteMany({ where: { userId: { in: createdUserIds } } });
      for (const userId of createdUserIds) {
        await prisma.availability.deleteMany({ where: { Schedule: { userId } } });
        await prisma.schedule.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });
      }
    }

    // TeamRepository.deleteById handles remaining memberships + managed event types
    for (const id of [...createdTeamIds].reverse()) {
      await teamRepo.deleteById({ id });
    }
  });

  afterEach(async () => {
    // Clean up any extra bookings created by individual tests, but keep the shared one
    const sharedBookingId = createdBookingIds[0];
    const extraIds = createdBookingIds.filter((id) => id !== sharedBookingId);
    if (extraIds.length > 0) {
      await prisma.tracking.deleteMany({ where: { bookingId: { in: extraIds } } });
      await prisma.attendee.deleteMany({ where: { bookingId: { in: extraIds } } });
      await prisma.booking.deleteMany({ where: { id: { in: extraIds } } });
      // Remove extra IDs but keep the shared one
      createdBookingIds.length = 0;
      createdBookingIds.push(sharedBookingId);
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

  describe("getBookingDetails - tracking and rescheduling", () => {
    it("returns booking details with tracking data", async () => {
      const service = new BookingDetailsService(prisma);
      const booking = await createTestBooking();

      await prisma.tracking.create({
        data: {
          bookingId: booking.id,
          utm_source: "test-source",
          utm_medium: "test-medium",
        },
      });

      const result = await service.getBookingDetails({
        userId: bookingOwnerId,
        bookingUid: booking.uid,
      });

      expect(result).toHaveProperty("tracking");
      expect(result.tracking).not.toBeNull();
    });

    it("returns null tracking when no tracking data exists", async () => {
      const service = new BookingDetailsService(prisma);
      const booking = await createTestBooking();

      const result = await service.getBookingDetails({
        userId: bookingOwnerId,
        bookingUid: booking.uid,
      });

      expect(result.tracking).toBeNull();
    });

    it("returns null rescheduledToBooking for non-rescheduled booking", async () => {
      const service = new BookingDetailsService(prisma);
      const booking = await createTestBooking();

      const result = await service.getBookingDetails({
        userId: bookingOwnerId,
        bookingUid: booking.uid,
      });

      expect(result.rescheduledToBooking).toBeNull();
    });

    it("returns rescheduledToBooking when booking was rescheduled", async () => {
      const service = new BookingDetailsService(prisma);
      const oldBooking = await createTestBooking({ rescheduled: true });

      const newOffset = bookingTimeOffset++;
      const newBooking = await prisma.booking.create({
        data: {
          uid: `booking-uid-${randomString()}`,
          title: "Rescheduled Booking",
          startTime: new Date(`2025-06-02T${String(10 + newOffset).padStart(2, "0")}:00:00.000Z`),
          endTime: new Date(`2025-06-02T${String(11 + newOffset).padStart(2, "0")}:00:00.000Z`),
          userId: bookingOwnerId,
          eventTypeId: personalEventTypeId,
          status: BookingStatus.ACCEPTED,
          fromReschedule: oldBooking.uid,
        },
      });
      createdBookingIds.push(newBooking.id);

      const result = await service.getBookingDetails({
        userId: bookingOwnerId,
        bookingUid: oldBooking.uid,
      });

      expect(result.rescheduledToBooking).not.toBeNull();
      expect(result.rescheduledToBooking?.uid).toBe(newBooking.uid);
    });

    it("returns previousBooking when booking is from reschedule", async () => {
      const service = new BookingDetailsService(prisma);
      const previousBooking = await createTestBooking({ rescheduled: true });

      const curOffset = bookingTimeOffset++;
      const currentBooking = await prisma.booking.create({
        data: {
          uid: `booking-uid-${randomString()}`,
          title: "Current Booking",
          startTime: new Date(`2025-06-02T${String(10 + curOffset).padStart(2, "0")}:00:00.000Z`),
          endTime: new Date(`2025-06-02T${String(11 + curOffset).padStart(2, "0")}:00:00.000Z`),
          userId: bookingOwnerId,
          eventTypeId: personalEventTypeId,
          status: BookingStatus.ACCEPTED,
          fromReschedule: previousBooking.uid,
        },
      });
      createdBookingIds.push(currentBooking.id);

      const result = await service.getBookingDetails({
        userId: bookingOwnerId,
        bookingUid: currentBooking.uid,
      });

      expect(result.previousBooking).not.toBeNull();
    });
  });
});
