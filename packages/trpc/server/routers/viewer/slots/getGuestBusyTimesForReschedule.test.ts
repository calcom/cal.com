import { SchedulingType } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IAvailableSlotsService } from "./util";
import { AvailableSlotsService } from "./util";

describe("AvailableSlotsService - _getGuestBusyTimesForReschedule", () => {
  type GetGuestBusyTimesForReschedule =
    typeof AvailableSlotsService.prototype._getGuestBusyTimesForReschedule;
  let service: AvailableSlotsService;
  let mockDependencies: {
    bookingRepo: {
      findByUidIncludeAttendeeEmails: ReturnType<typeof vi.fn>;
      findByUserIdsAndDateRange: ReturnType<typeof vi.fn>;
    };
    userRepo: {
      findByEmails: ReturnType<typeof vi.fn>;
    };
  };

  const dateFrom = new Date("2026-04-01T00:00:00Z");
  const dateTo = new Date("2026-04-30T23:59:59Z");
  const rescheduleUid = "booking-uid-123";

  beforeEach(() => {
    vi.clearAllMocks();

    mockDependencies = {
      bookingRepo: {
        findByUidIncludeAttendeeEmails: vi.fn(),
        findByUserIdsAndDateRange: vi.fn(),
      },
      userRepo: {
        findByEmails: vi.fn(),
      },
    };

    service = new AvailableSlotsService(mockDependencies as unknown as IAvailableSlotsService);
  });

  const callGetGuestBusyTimes = (params: {
    rescheduleUid: string | null | undefined;
    schedulingType: SchedulingType | null;
    hostUserIds?: number[];
    dateFrom: Date;
    dateTo: Date;
  }) =>
    (
      service as unknown as {
        _getGuestBusyTimesForReschedule: GetGuestBusyTimesForReschedule;
      }
    )._getGuestBusyTimesForReschedule(params);

  describe("early-exit conditions", () => {
    it("should return empty array when rescheduleUid is null", async () => {
      const result = await callGetGuestBusyTimes({
        rescheduleUid: null,
        schedulingType: null,
        hostUserIds: [1],
        dateFrom,
        dateTo,
      });

      expect(result).toEqual([]);
      expect(mockDependencies.bookingRepo.findByUidIncludeAttendeeEmails).not.toHaveBeenCalled();
    });

    it("should return empty array when rescheduleUid is undefined", async () => {
      const result = await callGetGuestBusyTimes({
        rescheduleUid: undefined,
        schedulingType: null,
        hostUserIds: [1],
        dateFrom,
        dateTo,
      });

      expect(result).toEqual([]);
      expect(mockDependencies.bookingRepo.findByUidIncludeAttendeeEmails).not.toHaveBeenCalled();
    });

    it("should return empty array for COLLECTIVE scheduling type", async () => {
      const result = await callGetGuestBusyTimes({
        rescheduleUid,
        schedulingType: SchedulingType.COLLECTIVE,
        hostUserIds: [1],
        dateFrom,
        dateTo,
      });

      expect(result).toEqual([]);
      expect(mockDependencies.bookingRepo.findByUidIncludeAttendeeEmails).not.toHaveBeenCalled();
    });

    it("should return empty array when original booking has no attendees", async () => {
      mockDependencies.bookingRepo.findByUidIncludeAttendeeEmails.mockResolvedValue({
        id: 1,
        uid: rescheduleUid,
        userId: 1,
        attendees: [],
      });

      const result = await callGetGuestBusyTimes({
        rescheduleUid,
        schedulingType: null,
        hostUserIds: [1],
        dateFrom,
        dateTo,
      });

      expect(result).toEqual([]);
      expect(mockDependencies.userRepo.findByEmails).not.toHaveBeenCalled();
    });

    it("should return empty array when original booking is not found", async () => {
      mockDependencies.bookingRepo.findByUidIncludeAttendeeEmails.mockResolvedValue(null);

      const result = await callGetGuestBusyTimes({
        rescheduleUid,
        schedulingType: null,
        hostUserIds: [1],
        dateFrom,
        dateTo,
      });

      expect(result).toEqual([]);
      expect(mockDependencies.userRepo.findByEmails).not.toHaveBeenCalled();
    });

    it("should return empty array when no attendees are Cal.com users", async () => {
      mockDependencies.bookingRepo.findByUidIncludeAttendeeEmails.mockResolvedValue({
        id: 1,
        uid: rescheduleUid,
        userId: 1,
        attendees: [{ email: "external@gmail.com" }],
      });
      mockDependencies.userRepo.findByEmails.mockResolvedValue([]);

      const result = await callGetGuestBusyTimes({
        rescheduleUid,
        schedulingType: null,
        hostUserIds: [1],
        dateFrom,
        dateTo,
      });

      expect(result).toEqual([]);
      expect(mockDependencies.bookingRepo.findByUserIdsAndDateRange).not.toHaveBeenCalled();
    });
  });

  describe("guest busy time collection", () => {
    it("should return busy times for Cal.com guest users", async () => {
      mockDependencies.bookingRepo.findByUidIncludeAttendeeEmails.mockResolvedValue({
        id: 1,
        uid: rescheduleUid,
        userId: 1,
        attendees: [{ email: "guest@cal.com" }],
      });
      mockDependencies.userRepo.findByEmails.mockResolvedValue([{ id: 10, email: "guest@cal.com" }]);
      mockDependencies.bookingRepo.findByUserIdsAndDateRange.mockResolvedValue([
        {
          uid: "other-booking-1",
          startTime: new Date("2026-04-10T09:00:00Z"),
          endTime: new Date("2026-04-10T10:00:00Z"),
          title: "Team standup",
          userId: 10,
          status: "ACCEPTED",
        },
      ]);

      const result = await callGetGuestBusyTimes({
        rescheduleUid,
        schedulingType: null,
        hostUserIds: [1],
        dateFrom,
        dateTo,
      });

      expect(result).toEqual([
        {
          start: new Date("2026-04-10T09:00:00Z"),
          end: new Date("2026-04-10T10:00:00Z"),
        },
      ]);
    });

    it("should pass excludeUid to the booking query to filter at database level", async () => {
      mockDependencies.bookingRepo.findByUidIncludeAttendeeEmails.mockResolvedValue({
        id: 1,
        uid: rescheduleUid,
        userId: 1,
        attendees: [{ email: "guest@cal.com" }],
      });
      mockDependencies.userRepo.findByEmails.mockResolvedValue([{ id: 10, email: "guest@cal.com" }]);
      mockDependencies.bookingRepo.findByUserIdsAndDateRange.mockResolvedValue([
        {
          uid: "different-booking",
          startTime: new Date("2026-04-10T16:00:00Z"),
          endTime: new Date("2026-04-10T17:00:00Z"),
          title: "Another meeting",
          userId: 10,
          status: "ACCEPTED",
        },
      ]);

      const result = await callGetGuestBusyTimes({
        rescheduleUid,
        schedulingType: null,
        hostUserIds: [1],
        dateFrom,
        dateTo,
      });

      expect(mockDependencies.bookingRepo.findByUserIdsAndDateRange).toHaveBeenCalledWith(
        expect.objectContaining({ excludeUid: rescheduleUid })
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        start: new Date("2026-04-10T16:00:00Z"),
        end: new Date("2026-04-10T17:00:00Z"),
      });
    });

    it("should return empty array on error (graceful degradation)", async () => {
      mockDependencies.bookingRepo.findByUidIncludeAttendeeEmails.mockRejectedValue(
        new Error("Database connection lost")
      );

      const result = await callGetGuestBusyTimes({
        rescheduleUid,
        schedulingType: null,
        hostUserIds: [1],
        dateFrom,
        dateTo,
      });

      expect(result).toEqual([]);
    });

    it("should skip guest check when attendee (not host) reschedules", async () => {
      // Booking was created by user 1, but current event hosts are [99]
      // This means the attendee is rescheduling, not the host
      mockDependencies.bookingRepo.findByUidIncludeAttendeeEmails.mockResolvedValue({
        id: 1,
        uid: rescheduleUid,
        userId: 1,
        attendees: [{ email: "guest@cal.com" }],
      });

      const result = await callGetGuestBusyTimes({
        rescheduleUid,
        schedulingType: null,
        hostUserIds: [99], // Not the booking host
        dateFrom,
        dateTo,
      });

      expect(result).toEqual([]);
      expect(mockDependencies.userRepo.findByEmails).not.toHaveBeenCalled();
    });

    it("should only use Cal.com user emails in booking query, not all attendee emails", async () => {
      mockDependencies.bookingRepo.findByUidIncludeAttendeeEmails.mockResolvedValue({
        id: 1,
        uid: rescheduleUid,
        userId: 1,
        attendees: [
          { email: "caluser@cal.com" },
          { email: "external@gmail.com" },
        ],
      });
      // Only caluser@cal.com is a Cal.com user
      mockDependencies.userRepo.findByEmails.mockResolvedValue([
        { id: 10, email: "caluser@cal.com" },
      ]);
      mockDependencies.bookingRepo.findByUserIdsAndDateRange.mockResolvedValue([]);

      await callGetGuestBusyTimes({
        rescheduleUid,
        schedulingType: null,
        hostUserIds: [1],
        dateFrom,
        dateTo,
      });

      // userEmails should only contain the Cal.com user's email
      expect(mockDependencies.bookingRepo.findByUserIdsAndDateRange).toHaveBeenCalledWith(
        expect.objectContaining({
          userEmails: ["caluser@cal.com"],
        })
      );
      // Should NOT contain external@gmail.com
      const callArgs = mockDependencies.bookingRepo.findByUserIdsAndDateRange.mock.calls[0][0];
      expect(callArgs.userEmails).not.toContain("external@gmail.com");
    });

    it("should handle multiple guest attendees who are Cal.com users", async () => {
      mockDependencies.bookingRepo.findByUidIncludeAttendeeEmails.mockResolvedValue({
        id: 1,
        uid: rescheduleUid,
        userId: 1,
        attendees: [{ email: "guest1@cal.com" }, { email: "guest2@cal.com" }],
      });
      mockDependencies.userRepo.findByEmails.mockResolvedValue([
        { id: 10, email: "guest1@cal.com" },
        { id: 20, email: "guest2@cal.com" },
      ]);
      mockDependencies.bookingRepo.findByUserIdsAndDateRange.mockResolvedValue([
        {
          uid: "booking-a",
          startTime: new Date("2026-04-10T09:00:00Z"),
          endTime: new Date("2026-04-10T10:00:00Z"),
          title: "Guest1 meeting",
          userId: 10,
          status: "ACCEPTED",
        },
        {
          uid: "booking-b",
          startTime: new Date("2026-04-11T14:00:00Z"),
          endTime: new Date("2026-04-11T15:00:00Z"),
          title: "Guest2 meeting",
          userId: 20,
          status: "ACCEPTED",
        },
      ]);

      const result = await callGetGuestBusyTimes({
        rescheduleUid,
        schedulingType: null,
        hostUserIds: [1],
        dateFrom,
        dateTo,
      });

      expect(result).toHaveLength(2);
      expect(mockDependencies.userRepo.findByEmails).toHaveBeenCalledWith({
        emails: ["guest1@cal.com", "guest2@cal.com"],
      });
      expect(mockDependencies.bookingRepo.findByUserIdsAndDateRange).toHaveBeenCalledWith({
        userIds: [10, 20],
        userEmails: ["guest1@cal.com", "guest2@cal.com"],
        dateFrom,
        dateTo,
      });
    });

    it("should work with ROUND_ROBIN scheduling type", async () => {
      mockDependencies.bookingRepo.findByUidIncludeAttendeeEmails.mockResolvedValue({
        id: 1,
        uid: rescheduleUid,
        userId: 1,
        attendees: [{ email: "guest@cal.com" }],
      });
      mockDependencies.userRepo.findByEmails.mockResolvedValue([{ id: 10, email: "guest@cal.com" }]);
      mockDependencies.bookingRepo.findByUserIdsAndDateRange.mockResolvedValue([]);

      const result = await callGetGuestBusyTimes({
        rescheduleUid,
        schedulingType: SchedulingType.ROUND_ROBIN,
        hostUserIds: [1],
        dateFrom,
        dateTo,
      });

      expect(result).toEqual([]);
      expect(mockDependencies.bookingRepo.findByUidIncludeAttendeeEmails).toHaveBeenCalledWith({
        uid: rescheduleUid,
        userId: 1,
      });
    });

    it("should pass correct userIds and emails to findByUserIdsAndDateRange", async () => {
      mockDependencies.bookingRepo.findByUidIncludeAttendeeEmails.mockResolvedValue({
        id: 1,
        uid: rescheduleUid,
        userId: 1,
        attendees: [{ email: "cal-user@example.com" }, { email: "external@gmail.com" }],
      });
      mockDependencies.userRepo.findByEmails.mockResolvedValue([
        { id: 42, email: "cal-user@example.com" },
      ]);
      mockDependencies.bookingRepo.findByUserIdsAndDateRange.mockResolvedValue([]);

      await callGetGuestBusyTimes({
        rescheduleUid,
        schedulingType: null,
        hostUserIds: [1],
        dateFrom,
        dateTo,
      });

      expect(mockDependencies.userRepo.findByEmails).toHaveBeenCalledWith({
        emails: ["cal-user@example.com", "external@gmail.com"],
      });
      expect(mockDependencies.bookingRepo.findByUserIdsAndDateRange).toHaveBeenCalledWith({
        userIds: [42],
        userEmails: ["cal-user@example.com", "external@gmail.com"],
        dateFrom,
        dateTo,
      });
    });
  });
});
