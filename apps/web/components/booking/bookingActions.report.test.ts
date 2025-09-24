import { describe, it, expect } from "vitest";

import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";

import { getReportActions, type BookingActionContext } from "./bookingActions";

const mockT = (key: string) => key;

function createMockContext(overrides: Partial<BookingActionContext> = {}): BookingActionContext {
  const now = new Date();
  const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

  return {
    booking: {
      id: 1,
      uid: "test-uid",
      title: "Test Booking",
      status: BookingStatus.ACCEPTED,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      createdAt: now,
      updatedAt: now,
      userPrimaryEmail: "user@example.com",
      user: {
        id: 1,
        name: "Test User",
        email: "user@example.com",
      },
      eventType: {
        id: 1,
        title: "Test Event",
        schedulingType: SchedulingType.ROUND_ROBIN,
        allowReschedulingPastBookings: false,
        recurringEvent: null,
        eventTypeColor: null,
        price: 0,
        currency: "USD",
        metadata: null,
        length: 60,
        slug: "test-event",
        team: null,
        hosts: [],
      },
      attendees: [],
      payment: [],
      paid: false,
      isRecorded: false,
      reportLogs: [],
      rescheduler: null,
      rescheduled: null,
      fromReschedule: null,
      responses: null,
      location: null,
      description: null,
      customInputs: [],
      references: [],
      recurringEventId: null,
      seatsReferences: [],
      metadata: null,
      routedFromRoutingFormReponse: null,
      assignmentReason: [],
      ...overrides.booking,
      listingStatus: "upcoming" as const,
      recurringInfo: undefined,
      loggedInUser: {
        userId: 1,
        userTimeZone: "UTC",
        userTimeFormat: 24,
        userEmail: "user@example.com",
      },
      isToday: false,
    },
    isUpcoming: true,
    isOngoing: false,
    isBookingInPast: false,
    isCancelled: false,
    isConfirmed: true,
    isRejected: false,
    isPending: false,
    isRescheduled: false,
    isRecurring: false,
    isTabRecurring: false,
    isTabUnconfirmed: false,
    isBookingFromRoutingForm: false,
    isDisabledCancelling: false,
    isDisabledRescheduling: false,
    isCalVideoLocation: true,
    showPendingPayment: false,
    cardCharged: false,
    isAttendee: false,
    attendeeList: [
      {
        name: "Test Attendee",
        email: "attendee@example.com",
        id: 1,
        noShow: false,
        phoneNumber: null,
      },
    ],
    getSeatReferenceUid: () => undefined,
    t: mockT,
    ...overrides,
  };
}

describe("Report Booking Actions", () => {
  describe("getReportActions", () => {
    it("should return report action for unreported booking", () => {
      const context = createMockContext();
      const actions = getReportActions(context);

      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual({
        id: "report",
        label: "report",
        icon: "flag",
        disabled: false,
      });
    });

    it("should return report action for any booking status", () => {
      const statuses = [
        BookingStatus.ACCEPTED,
        BookingStatus.CANCELLED,
        BookingStatus.PENDING,
        BookingStatus.REJECTED,
      ];

      statuses.forEach((status) => {
        const context = createMockContext();
        context.booking.status = status;
        const actions = getReportActions(context);

        expect(actions).toHaveLength(1);
        expect(actions[0].id).toBe("report");
      });
    });

    it("should return report action for past bookings", () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const context = createMockContext({
        isUpcoming: false,
        isBookingInPast: true,
      });
      context.booking.startTime = pastDate.toISOString();
      context.booking.endTime = new Date(pastDate.getTime() + 60 * 60 * 1000).toISOString();
      const actions = getReportActions(context);

      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe("report");
    });

    it("should return report action for upcoming bookings", () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const context = createMockContext({
        isUpcoming: true,
        isBookingInPast: false,
      });
      context.booking.startTime = futureDate.toISOString();
      context.booking.endTime = new Date(futureDate.getTime() + 60 * 60 * 1000).toISOString();
      const actions = getReportActions(context);

      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe("report");
    });

    it("should return report action for team bookings", () => {
      const context = createMockContext();
      context.booking.eventType = {
        ...context.booking.eventType,
        id: 1,
        title: "Team Event",
        schedulingType: SchedulingType.COLLECTIVE,
        team: {
          id: 1,
          name: "Test Team",
          slug: "test-team",
        },
      };
      const actions = getReportActions(context);

      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe("report");
    });

    it("should return report action for individual bookings", () => {
      const context = createMockContext();
      context.booking.eventType = {
        ...context.booking.eventType,
        id: 2,
        title: "Individual Event",
        schedulingType: null,
        team: null,
      };
      const actions = getReportActions(context);

      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe("report");
    });
  });
});
