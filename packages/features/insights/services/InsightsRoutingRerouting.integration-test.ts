import { randomUUID } from "crypto";
import { describe, expect, it } from "vitest";

import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import { prisma } from "@calcom/prisma";
import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";

import { InsightsRoutingBaseService as InsightsRoutingService } from "./InsightsRoutingBaseService";

// Helper to create test data with rerouting
async function createReroutingTestData() {
  const user = await prisma.user.create({
    data: {
      email: `test-user-${randomUUID()}@example.com`,
      username: `testuser-${randomUUID()}`,
      name: "Test User",
    },
  });

  const org = await prisma.team.create({
    data: {
      name: "Test Org",
      slug: `test-org-${randomUUID()}`,
      isOrganization: true,
    },
  });

  const team = await prisma.team.create({
    data: {
      name: "Test Team",
      slug: `test-team-${randomUUID()}`,
      parentId: org.id,
    },
  });

  await prisma.membership.create({
    data: {
      userId: user.id,
      teamId: team.id,
      role: MembershipRole.OWNER,
      accepted: true,
    },
  });

  await prisma.membership.create({
    data: {
      userId: user.id,
      teamId: org.id,
      role: MembershipRole.OWNER,
      accepted: true,
    },
  });

  const eventType = await prisma.eventType.create({
    data: {
      title: "Test Event",
      slug: `test-event-${randomUUID()}`,
      length: 30,
      userId: user.id,
      teamId: team.id,
    },
  });

  const form = await prisma.app_RoutingForms_Form.create({
    data: {
      name: "Test Form",
      userId: user.id,
      teamId: team.id,
      fields: [{ id: "field1", type: "text", label: "Name", required: true }],
    },
  });

  // Create original booking
  const originalBooking = await prisma.booking.create({
    data: {
      uid: `original-${randomUUID()}`,
      title: "Original Booking",
      startTime: new Date(),
      endTime: new Date(Date.now() + 30 * 60 * 1000),
      userId: user.id,
      eventTypeId: eventType.id,
      status: BookingStatus.CANCELLED,
    },
  });

  // Create rerouted booking
  const reroutedBooking = await prisma.booking.create({
    data: {
      uid: `rerouted-${randomUUID()}`,
      title: "Rerouted Booking",
      startTime: new Date(),
      endTime: new Date(Date.now() + 30 * 60 * 1000),
      userId: user.id,
      eventTypeId: eventType.id,
      status: BookingStatus.ACCEPTED,
      fromReschedule: originalBooking.uid,
    },
  });

  const formResponse = await prisma.app_RoutingForms_FormResponse.create({
    data: {
      formFillerId: `filler-${randomUUID()}`,
      formId: form.id,
      response: { field1: { label: "Name", value: "Test" } },
      routedToBookingUid: reroutedBooking.uid,
    },
  });

  const cleanup = async () => {
    await prisma.app_RoutingForms_FormResponse.delete({ where: { id: formResponse.id } });
    await prisma.booking.delete({ where: { id: reroutedBooking.id } });
    await prisma.booking.delete({ where: { id: originalBooking.id } });
    await prisma.app_RoutingForms_Form.delete({ where: { id: form.id } });
    await prisma.eventType.delete({ where: { id: eventType.id } });
    await prisma.membership.deleteMany({ where: { userId: user.id } });
    await prisma.team.delete({ where: { id: team.id } });
    await prisma.team.delete({ where: { id: org.id } });
    await prisma.user.delete({ where: { id: user.id } });
  };

  return {
    user,
    org,
    team,
    eventType,
    form,
    formResponse,
    originalBooking,
    reroutedBooking,
    cleanup,
  };
}

describe("InsightsRoutingService - Rerouting Tests", () => {
  it("should show both original and rerouted bookings when no filter applied", async () => {
    const testData = await createReroutingTestData();

    const service = new InsightsRoutingService({
      prisma,
      options: {
        scope: "org",
        userId: testData.user.id,
        orgId: testData.org.id,
      },
      filters: {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    const result = await service.getTableData({ sorting: [], limit: 10, offset: 0 });

    // Should return both original and rerouted bookings
    expect(result.data.length).toBeGreaterThanOrEqual(2);
    
    const originalEntry = result.data.find(d => d.bookingUid === testData.originalBooking.uid);
    const reroutedEntry = result.data.find(d => d.bookingUid === testData.reroutedBooking.uid);

    expect(originalEntry).toBeDefined();
    expect(reroutedEntry).toBeDefined();
    expect(originalEntry?.isRerouted).toBe("original");
    expect(reroutedEntry?.isRerouted).toBe("rerouted");

    await testData.cleanup();
  });

  it("should filter only rerouted bookings", async () => {
    const testData = await createReroutingTestData();

    const service = new InsightsRoutingService({
      prisma,
      options: {
        scope: "org",
        userId: testData.user.id,
        orgId: testData.org.id,
      },
      filters: {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        columnFilters: [
          {
            id: "reroutingStatus",
            value: { type: ColumnFilterType.SINGLE_SELECT, data: "rerouted" },
          },
        ],
      },
    });

    const result = await service.getTableData({ sorting: [], limit: 10, offset: 0 });

    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.every(d => d.fromReschedule !== null)).toBe(true);

    await testData.cleanup();
  });

  it("should filter only original (routed) bookings", async () => {
    const testData = await createReroutingTestData();

    const service = new InsightsRoutingService({
      prisma,
      options: {
        scope: "org",
        userId: testData.user.id,
        orgId: testData.org.id,
      },
      filters: {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        columnFilters: [
          {
            id: "reroutingStatus",
            value: { type: ColumnFilterType.SINGLE_SELECT, data: "original" },
          },
        ],
      },
    });

    const result = await service.getTableData({ sorting: [], limit: 10, offset: 0 });

    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.every(d => d.isRerouted === "original")).toBe(true);
    expect(result.data.every(d => d.isOriginalBooking === true)).toBe(true);

    await testData.cleanup();
  });

  it("should exclude rerouted bookings from standard filter", async () => {
    const testData = await createReroutingTestData();

    // Create a standard booking (not rerouted)
    const standardBooking = await prisma.booking.create({
      data: {
        uid: `standard-${randomUUID()}`,
        title: "Standard Booking",
        startTime: new Date(),
        endTime: new Date(Date.now() + 30 * 60 * 1000),
        userId: testData.user.id,
        eventTypeId: testData.eventType.id,
        status: BookingStatus.ACCEPTED,
      },
    });

    const standardFormResponse = await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: `filler-${randomUUID()}`,
        formId: testData.form.id,
        response: { field1: { label: "Name", value: "Standard" } },
        routedToBookingUid: standardBooking.uid,
      },
    });

    const service = new InsightsRoutingService({
      prisma,
      options: {
        scope: "org",
        userId: testData.user.id,
        orgId: testData.org.id,
      },
      filters: {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        columnFilters: [
          {
            id: "reroutingStatus",
            value: { type: ColumnFilterType.SINGLE_SELECT, data: "none" },
          },
        ],
      },
    });

    const result = await service.getTableData({ sorting: [], limit: 10, offset: 0 });

    // Should only return standard booking, not rerouted or original
    expect(result.data.some(d => d.bookingUid === standardBooking.uid)).toBe(true);
    expect(result.data.some(d => d.bookingUid === testData.reroutedBooking.uid)).toBe(false);
    expect(result.data.some(d => d.bookingUid === testData.originalBooking.uid)).toBe(false);

    await prisma.app_RoutingForms_FormResponse.delete({ where: { id: standardFormResponse.id } });
    await prisma.booking.delete({ where: { id: standardBooking.id } });
    await testData.cleanup();
  });

  it("should preserve form responses for both original and rerouted bookings", async () => {
    const testData = await createReroutingTestData();

    const service = new InsightsRoutingService({
      prisma,
      options: {
        scope: "org",
        userId: testData.user.id,
        orgId: testData.org.id,
      },
      filters: {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    const result = await service.getTableData({ sorting: [], limit: 10, offset: 0 });

    const originalEntry = result.data.find(d => d.bookingUid === testData.originalBooking.uid);
    const reroutedEntry = result.data.find(d => d.bookingUid === testData.reroutedBooking.uid);

    // Both should have the same form response ID
    expect(originalEntry?.id).toBe(testData.formResponse.id);
    expect(reroutedEntry?.id).toBe(testData.formResponse.id);

    // Both should have fields populated
    expect(originalEntry?.fields).toBeDefined();
    expect(reroutedEntry?.fields).toBeDefined();

    await testData.cleanup();
  });

  it("should show rerouting chain with UIDs", async () => {
    const testData = await createReroutingTestData();

    const service = new InsightsRoutingService({
      prisma,
      options: {
        scope: "org",
        userId: testData.user.id,
        orgId: testData.org.id,
      },
      filters: {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    const result = await service.getTableData({ sorting: [], limit: 10, offset: 0 });

    const originalEntry = result.data.find(d => d.bookingUid === testData.originalBooking.uid);
    const reroutedEntry = result.data.find(d => d.bookingUid === testData.reroutedBooking.uid);

    // Original should point to rerouted
    expect(originalEntry?.reroutedToBookingUid).toBe(testData.reroutedBooking.uid);

    // Rerouted should point back to original
    expect(reroutedEntry?.reroutedFromBookingUid).toBe(testData.originalBooking.uid);
    expect(reroutedEntry?.fromReschedule).toBe(testData.originalBooking.uid);

    await testData.cleanup();
  });
});
