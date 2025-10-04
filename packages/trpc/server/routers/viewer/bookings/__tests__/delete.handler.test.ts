import { describe, it, expect, vi, beforeEach } from "vitest";

import { prisma } from "@calcom/prisma";

import { deleteHandler } from "../delete.handler";
import type { BookingsProcedureContext } from "../util";

vi.mock("@calcom/prisma", () => {
  return {
    prisma: {
      booking: {
        update: vi.fn(),
      },
    },
  };
});

describe("viewer.bookings.delete handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a past booking by setting deleted flag only", async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const ctx: BookingsProcedureContext = {
      booking: {
        id: 1,
        uid: "uid",
        eventTypeId: 1,
        title: "title",
        description: null,
        customInputs: null,
        responses: null,
        startTime: past,
        endTime: past,
        location: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "accepted",
        paid: false,
        userId: 1,
        cancellationReason: null,
        rejectionReason: null,
        reassignReason: null,
        reassignById: null,
        dynamicEventSlugRef: null,
        dynamicGroupSlugRef: null,
        rescheduled: null,
        fromReschedule: null,
        recurringEventId: null,
        smsReminderNumber: null,
        metadata: {},
        isRecorded: false,
        iCalUID: "",
        iCalSequence: 0,
        rating: null,
        ratingFeedback: null,
        noShowHost: false,
        oneTimePassword: "otp",
        cancelledBy: null,
        rescheduledBy: null,
        tracking: null,
        routingFormResponses: [],
        expenseLogs: [],
        attendees: [],
        references: [],
        destinationCalendar: null,
        eventType: null,
        user: null,
        seatsReferences: [],
        instantMeetingToken: null,
        assignmentReason: [],
        scheduledTriggers: [],
      },
    };

    await deleteHandler({ ctx, input: { bookingId: 1 } as any });

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { deleted: true },
    });
  });

  it("throws when trying to delete a future booking", async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const ctx: BookingsProcedureContext = {
      booking: {
        id: 2,
        uid: "uid2",
        eventTypeId: 1,
        title: "title2",
        description: null,
        customInputs: null,
        responses: null,
        startTime: future,
        endTime: future,
        location: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "accepted",
        paid: false,
        userId: 1,
        cancellationReason: null,
        rejectionReason: null,
        reassignReason: null,
        reassignById: null,
        dynamicEventSlugRef: null,
        dynamicGroupSlugRef: null,
        rescheduled: null,
        fromReschedule: null,
        recurringEventId: null,
        smsReminderNumber: null,
        metadata: {},
        isRecorded: false,
        iCalUID: "",
        iCalSequence: 0,
        rating: null,
        ratingFeedback: null,
        noShowHost: false,
        oneTimePassword: "otp",
        cancelledBy: null,
        rescheduledBy: null,
        tracking: null,
        routingFormResponses: [],
        expenseLogs: [],
        attendees: [],
        references: [],
        destinationCalendar: null,
        eventType: null,
        user: null,
        seatsReferences: [],
        instantMeetingToken: null,
        assignmentReason: [],
        scheduledTriggers: [],
      },
    };

    await expect(deleteHandler({ ctx, input: { bookingId: 2 } as any })).rejects.toThrow(
      "Cannot delete future bookings"
    );
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });
});
