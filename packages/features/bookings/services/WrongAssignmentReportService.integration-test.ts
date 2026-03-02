import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { randomString } from "@calcom/lib/random";
import { prisma } from "@calcom/prisma";
import type { WrongAssignmentReportStatus } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "../repositories/BookingRepository";
import { WrongAssignmentReportRepository } from "../repositories/WrongAssignmentReportRepository";
import { WrongAssignmentReportService } from "./WrongAssignmentReportService";

vi.mock("@calcom/features/webhooks/lib/getWebhooks", () => ({
  default: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/features/webhooks/lib/sendPayload", () => ({
  sendGenericWebhookPayload: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

let testUserId: number;
let testTeamId: number;
let testEventTypeId: number | null = null;
let createdEventType = false;
let createdTeam = false;
const createdBookingIds: number[] = [];
const createdReportIds: string[] = [];

async function cleanup() {
  if (createdReportIds.length > 0) {
    await prisma.wrongAssignmentReport.deleteMany({
      where: { id: { in: createdReportIds } },
    });
    createdReportIds.length = 0;
  }
  if (createdBookingIds.length > 0) {
    await prisma.wrongAssignmentReport.deleteMany({
      where: {
        booking: { id: { in: createdBookingIds } },
      },
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

let bookingTimeOffset = 0;

async function createTestBooking(uid: string) {
  const offset = bookingTimeOffset++;
  const booking = await prisma.booking.create({
    data: {
      uid: `booking-uid-${randomString()}`,
      title: "Wrong Assignment Test Booking",
      startTime: new Date(`2025-06-18T${String(10 + offset).padStart(2, "0")}:00:00.000Z`),
      endTime: new Date(`2025-06-18T${String(11 + offset).padStart(2, "0")}:00:00.000Z`),
      userId: testUserId,
      eventTypeId: testEventTypeId,
      status: BookingStatus.ACCEPTED,
    },
  });
  createdBookingIds.push(booking.id);

  await prisma.attendee.create({
    data: {
      email: "guest@test.com",
      name: "Guest",
      timeZone: "UTC",
      bookingId: booking.id,
    },
  });

  return booking;
}

describe("WrongAssignmentReportService (Integration Tests)", () => {
  let service: WrongAssignmentReportService;

  beforeAll(async () => {
    const testUser = await prisma.user.findFirstOrThrow({
      where: { email: "member0-acme@example.com" },
    });
    testUserId = testUser.id;

    let team = await prisma.team.findFirst({
      where: { slug: { not: null } },
    });

    if (!team) {
      team = await prisma.team.create({
        data: {
          name: "Wrong Assignment Test Team",
          slug: `wrong-assign-test-${randomString()}`,
        },
      });
      createdTeam = true;
    }
    testTeamId = team.id;

    let eventType = await prisma.eventType.findFirst({
      where: { userId: testUserId, teamId: testTeamId },
    });

    if (!eventType) {
      eventType = await prisma.eventType.create({
        data: {
          title: "Wrong Assign Test Event",
          slug: `wrong-assign-test-${randomString()}`,
          length: 30,
          userId: testUserId,
          teamId: testTeamId,
        },
      });
      createdEventType = true;
    }
    testEventTypeId = eventType.id;

    const bookingRepo = new BookingRepository(prisma);
    const wrongAssignmentReportRepo = new WrongAssignmentReportRepository(prisma);
    const teamRepo = new TeamRepository(prisma);

    service = new WrongAssignmentReportService({
      bookingRepo,
      wrongAssignmentReportRepo,
      teamRepo,
    });
  });

  afterAll(async () => {
    await cleanup();
    if (createdEventType && testEventTypeId) {
      await prisma.eventType.delete({ where: { id: testEventTypeId } }).catch(() => {});
    }
    if (createdTeam) {
      await prisma.team.delete({ where: { id: testTeamId } }).catch(() => {});
    }
  });

  afterEach(async () => {
    await cleanup();
  });

  describe("report", () => {
    it("creates a wrong assignment report for a valid booking", async () => {
      const booking = await createTestBooking("report-1");

      const result = await service.report({
        userId: testUserId,
        userEmail: "member0-acme@example.com",
        userName: "Test User",
        userLocale: "en",
        bookingUid: booking.uid,
        correctAssignee: "correct-person@test.com",
        additionalNotes: "This booking was assigned to the wrong person",
      });

      expect(result.success).toBe(true);
      expect(result.reportId).toBeDefined();
      createdReportIds.push(result.reportId);

      const dbReport = await prisma.wrongAssignmentReport.findUnique({
        where: { id: result.reportId },
      });
      expect(dbReport).not.toBeNull();
      expect(dbReport?.bookingUid).toBe(booking.uid);
      expect(dbReport?.correctAssignee).toBe("correct-person@test.com");
      expect(dbReport?.additionalNotes).toBe("This booking was assigned to the wrong person");
    });

    it("throws error when booking is already reported", async () => {
      const booking = await createTestBooking("report-duplicate");

      const firstResult = await service.report({
        userId: testUserId,
        userEmail: "member0-acme@example.com",
        userName: "Test User",
        userLocale: "en",
        bookingUid: booking.uid,
        additionalNotes: "First report",
      });
      createdReportIds.push(firstResult.reportId);

      await expect(
        service.report({
          userId: testUserId,
          userEmail: "member0-acme@example.com",
          userName: "Test User",
          userLocale: "en",
          bookingUid: booking.uid,
          additionalNotes: "Duplicate report",
        })
      ).rejects.toThrow();
    });

    it("throws error when booking does not exist", async () => {
      await expect(
        service.report({
          userId: testUserId,
          userEmail: "member0-acme@example.com",
          userName: "Test User",
          userLocale: "en",
          bookingUid: "nonexistent-booking-uid",
          additionalNotes: "Report for missing booking",
        })
      ).rejects.toThrow("Booking not found");
    });

    it("stores null correctAssignee when not provided", async () => {
      const booking = await createTestBooking("report-no-assignee");

      const result = await service.report({
        userId: testUserId,
        userEmail: "member0-acme@example.com",
        userName: "Test User",
        userLocale: "en",
        bookingUid: booking.uid,
        additionalNotes: "No correct assignee specified",
      });
      createdReportIds.push(result.reportId);

      const dbReport = await prisma.wrongAssignmentReport.findUnique({
        where: { id: result.reportId },
      });
      expect(dbReport?.correctAssignee).toBeNull();
    });
  });

  describe("listReports", () => {
    it("returns reports filtered by team and status", async () => {
      const booking1 = await createTestBooking("list-1");
      const booking2 = await createTestBooking("list-2");

      const report1 = await prisma.wrongAssignmentReport.create({
        data: {
          bookingUid: booking1.uid,
          reportedById: testUserId,
          additionalNotes: "Report 1",
          teamId: testTeamId,
          status: "PENDING",
        },
      });
      createdReportIds.push(report1.id);

      const report2 = await prisma.wrongAssignmentReport.create({
        data: {
          bookingUid: booking2.uid,
          reportedById: testUserId,
          additionalNotes: "Report 2",
          teamId: testTeamId,
          status: "PENDING",
        },
      });
      createdReportIds.push(report2.id);

      const result = await service.listReports({
        teamId: testTeamId,
        isAll: false,
        statuses: ["PENDING"] as WrongAssignmentReportStatus[],
        limit: 10,
        offset: 0,
      });

      expect(result.reports.length).toBeGreaterThanOrEqual(2);
      expect(result.totalCount).toBeGreaterThanOrEqual(2);
    });

    it("paginates results with limit and offset", async () => {
      const booking1 = await createTestBooking("page-1");
      const booking2 = await createTestBooking("page-2");
      const booking3 = await createTestBooking("page-3");

      for (const booking of [booking1, booking2, booking3]) {
        const report = await prisma.wrongAssignmentReport.create({
          data: {
            bookingUid: booking.uid,
            reportedById: testUserId,
            additionalNotes: `Paginated report for ${booking.uid}`,
            teamId: testTeamId,
            status: "PENDING",
          },
        });
        createdReportIds.push(report.id);
      }

      const firstPage = await service.listReports({
        teamId: testTeamId,
        isAll: false,
        statuses: ["PENDING"] as WrongAssignmentReportStatus[],
        limit: 2,
        offset: 0,
      });

      expect(firstPage.reports.length).toBeLessThanOrEqual(2);
      expect(firstPage.totalCount).toBeGreaterThanOrEqual(3);
      expect(firstPage.hasMore).toBe(true);
    });

    it("returns empty results for nonexistent team", async () => {
      const result = await service.listReports({
        teamId: 999999,
        isAll: false,
        statuses: ["PENDING"] as WrongAssignmentReportStatus[],
        limit: 10,
        offset: 0,
      });

      expect(result.reports).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it("filters by reportedById when provided", async () => {
      const booking = await createTestBooking("filter-reporter");

      const report = await prisma.wrongAssignmentReport.create({
        data: {
          bookingUid: booking.uid,
          reportedById: testUserId,
          additionalNotes: "Reporter filter test",
          teamId: testTeamId,
          status: "PENDING",
        },
      });
      createdReportIds.push(report.id);

      const result = await service.listReports({
        teamId: testTeamId,
        isAll: false,
        statuses: ["PENDING"] as WrongAssignmentReportStatus[],
        reportedById: testUserId,
        limit: 10,
        offset: 0,
      });

      expect(result.reports.length).toBeGreaterThanOrEqual(1);
      const reportIds = result.reports.map((r) => r.id);
      expect(reportIds).toContain(report.id);
    });
  });
});
