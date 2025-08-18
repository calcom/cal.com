import prismaMock from "../../tests/libs/__mocks__/prismaMock";

import { describe, beforeEach, vi, expect, test } from "vitest";

import handleMarkNoShow from "./handleMarkNoShow";

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string, options?: any) => {
    if (key === "x_marked_as_no_show") return `${options?.x} marked as no-show`;
    if (key === "x_unmarked_as_no_show") return `${options?.x} unmarked as no-show`;
    if (key === "no_show_updated") return "No-show status updated";
    if (key === "booking_no_show_updated") return "Booking no-show updated";
    return key;
  }),
}));

vi.mock("@calcom/features/webhooks/lib/WebhookService", () => ({
  WebhookService: {
    init: vi.fn().mockResolvedValue({
      sendPayload: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock("@calcom/lib/getOrgIdFromMemberOrTeamId", () => ({
  default: vi.fn().mockResolvedValue(null),
}));

vi.mock("@calcom/lib/server/repository/booking", () => ({
  BookingRepository: vi.fn().mockImplementation(() => ({
    findBookingByUidAndUserId: vi.fn().mockResolvedValue({
      id: 1,
      uid: "test-booking-uid",
      startTime: new Date("2023-01-01T10:00:00Z"),
      endTime: new Date("2023-01-01T09:00:00Z"), // Past booking
    }),
  })),
}));

vi.mock("@calcom/trpc/server/routers/viewer/workflows/util", () => ({
  getAllWorkflowsFromEventType: vi.fn().mockResolvedValue([
    {
      id: 1,
      trigger: "BOOKING_NO_SHOW_UPDATED",
      steps: [
        {
          id: 1,
          action: "EMAIL_HOST",
          template: "REMINDER",
        },
      ],
    },
  ]),
}));

vi.mock("@calcom/features/ee/workflows/lib/reminders/reminderScheduler", () => ({
  scheduleWorkflowReminders: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/lib/getBookerUrl/server", () => ({
  getBookerBaseUrl: vi.fn().mockResolvedValue("https://cal.com"),
}));

vi.mock("./noShow/handleSendingAttendeeNoShowDataToApps", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

describe("handleMarkNoShow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.attendee.findMany.mockResolvedValue([{ id: 1, email: "attendee@example.com" }]);

    prismaMock.attendee.update.mockResolvedValue({
      id: 1,
      email: "attendee@example.com",
      noShow: true,
    });

    prismaMock.booking.findUnique.mockResolvedValue({
      id: 1,
      uid: "test-booking-uid",
      startTime: new Date("2023-01-01T10:00:00Z"),
      endTime: new Date("2023-01-01T11:00:00Z"),
      location: "Test Location",
      metadata: {},
      eventType: {
        id: 1,
        title: "Test Event",
        slug: "test-event",
        schedulingType: null,
        owner: {
          id: 101,
          email: "organizer@example.com",
          name: "Organizer",
          timeZone: "UTC",
          locale: "en",
        },
        team: null,
      },
      attendees: [
        {
          id: 1,
          email: "attendee@example.com",
          name: "Attendee",
          timeZone: "UTC",
          locale: "en",
        },
      ],
      user: {
        id: 101,
        email: "organizer@example.com",
        name: "Organizer",
        timeZone: "UTC",
        locale: "en",
      },
    });

    prismaMock.booking.update.mockResolvedValue({
      id: 1,
      uid: "test-booking-uid",
      noShowHost: true,
    });
  });

  test("should successfully mark attendee as no-show and trigger webhook and workflow", async () => {
    const result = await handleMarkNoShow({
      bookingUid: "test-booking-uid",
      attendees: [{ email: "attendee@example.com", noShow: true }],
      userId: 101,
      locale: "en",
    });

    expect(result.attendees).toHaveLength(1);
    expect(result.attendees[0]).toEqual({
      email: "attendee@example.com",
      noShow: true,
    });
    expect(result.message).toBe("attendee@example.com marked as no-show");

    const { WebhookService } = await import("@calcom/features/webhooks/lib/WebhookService");
    expect(WebhookService.init).toHaveBeenCalledWith({
      teamId: undefined,
      userId: undefined,
      eventTypeId: 1,
      orgId: null,
      triggerEvent: "BOOKING_NO_SHOW_UPDATED",
      oAuthClientId: undefined,
    });

    const { scheduleWorkflowReminders } = await import(
      "@calcom/features/ee/workflows/lib/reminders/reminderScheduler"
    );
    expect(scheduleWorkflowReminders).toHaveBeenCalledWith({
      workflows: [
        {
          id: 1,
          trigger: "BOOKING_NO_SHOW_UPDATED",
          steps: [
            {
              id: 1,
              action: "EMAIL_HOST",
              template: "REMINDER",
            },
          ],
        },
      ],
      smsReminderNumber: null,
      calendarEvent: expect.objectContaining({
        type: "Test Event",
        title: "Test Event",
        uid: "test-booking-uid",
      }),
    });
  });

  test("should successfully mark host as no-show", async () => {
    const result = await handleMarkNoShow({
      bookingUid: "test-booking-uid",
      noShowHost: true,
      userId: 101,
      locale: "en",
    });

    expect(result.noShowHost).toBe(true);
    expect(result.message).toBe("Booking no-show updated");

    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: {
        uid: "test-booking-uid",
      },
      data: {
        noShowHost: true,
      },
    });
  });

  test("should handle multiple attendees", async () => {
    prismaMock.attendee.findMany.mockResolvedValue([
      { id: 1, email: "attendee1@example.com" },
      { id: 2, email: "attendee2@example.com" },
    ]);

    prismaMock.attendee.update
      .mockResolvedValueOnce({
        id: 1,
        email: "attendee1@example.com",
        noShow: true,
      })
      .mockResolvedValueOnce({
        id: 2,
        email: "attendee2@example.com",
        noShow: false,
      });

    const result = await handleMarkNoShow({
      bookingUid: "test-booking-uid",
      attendees: [
        { email: "attendee1@example.com", noShow: true },
        { email: "attendee2@example.com", noShow: false },
      ],
      userId: 101,
      locale: "en",
    });

    expect(result.attendees).toHaveLength(2);
    expect(result.attendees).toEqual([
      { email: "attendee1@example.com", noShow: true },
      { email: "attendee2@example.com", noShow: false },
    ]);
    expect(result.message).toBe("No-show status updated");
  });

  test("should handle both attendee and host no-show", async () => {
    const result = await handleMarkNoShow({
      bookingUid: "test-booking-uid",
      attendees: [{ email: "attendee@example.com", noShow: true }],
      noShowHost: true,
      userId: 101,
      locale: "en",
    });

    expect(result.attendees).toHaveLength(1);
    expect(result.attendees[0]).toEqual({
      email: "attendee@example.com",
      noShow: true,
    });
    expect(result.noShowHost).toBe(true);
    expect(result.message).toBe("Booking no-show updated");

    expect(prismaMock.attendee.update).toHaveBeenCalled();
    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: {
        uid: "test-booking-uid",
      },
      data: {
        noShowHost: true,
      },
    });
  });

  test("should throw error when userId is not provided", async () => {
    await expect(
      handleMarkNoShow({
        bookingUid: "test-booking-uid",
        attendees: [{ email: "attendee@example.com", noShow: true }],
      })
    ).rejects.toThrow("Failed to update no-show status");
  });

  test("should unmark attendee as no-show", async () => {
    prismaMock.attendee.update.mockResolvedValue({
      id: 1,
      email: "attendee@example.com",
      noShow: false,
    });

    const result = await handleMarkNoShow({
      bookingUid: "test-booking-uid",
      attendees: [{ email: "attendee@example.com", noShow: false }],
      userId: 101,
      locale: "en",
    });

    expect(result.attendees).toHaveLength(1);
    expect(result.attendees[0]).toEqual({
      email: "attendee@example.com",
      noShow: false,
    });
    expect(result.message).toBe("attendee@example.com unmarked as no-show");
  });
});
