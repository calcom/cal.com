import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GuestBusyTimesDeps } from "./util";
import { getGuestBusyTimesForReschedule } from "./util";

function createMockDeps(): GuestBusyTimesDeps {
  return {
    bookingRepo: {
      findByUidIncludeEventType: vi.fn(),
      findAcceptedByUserIdsOrEmails: vi.fn(),
    },
    userRepo: {
      findByEmails: vi.fn(),
    },
  };
}

const baseArgs = {
  rescheduleUid: "uid-123",
  startDate: new Date("2025-06-01T00:00:00Z"),
  endDate: new Date("2025-06-30T23:59:59Z"),
  hostEmails: ["host@example.com"],
};

describe("getGuestBusyTimesForReschedule", () => {
  let deps: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it("returns empty array when booking is not found", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });
    expect(result).toEqual([]);
  });

  it("returns empty array when booking has no attendees", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockResolvedValue({
      attendees: [],
    });
    const result = await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });
    expect(result).toEqual([]);
    expect(deps.userRepo.findByEmails).not.toHaveBeenCalled();
  });

  it("returns empty array when all attendees are hosts", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockResolvedValue({
      attendees: [{ email: "host@example.com" }],
    });
    const result = await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });
    expect(result).toEqual([]);
    expect(deps.userRepo.findByEmails).not.toHaveBeenCalled();
  });

  it("filters host emails case-insensitively", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockResolvedValue({
      attendees: [{ email: "Host@Example.com" }, { email: "guest@example.com" }],
    });
    (deps.userRepo.findByEmails as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });
    expect(deps.userRepo.findByEmails).toHaveBeenCalledWith({
      emails: ["guest@example.com"],
    });
  });

  it("returns empty array when no guests are Cal.com users", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockResolvedValue({
      attendees: [{ email: "guest@example.com" }],
    });
    (deps.userRepo.findByEmails as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });
    expect(result).toEqual([]);
    expect(deps.bookingRepo.findAcceptedByUserIdsOrEmails).not.toHaveBeenCalled();
  });

  it("returns busy times from guest bookings", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockResolvedValue({
      attendees: [{ email: "guest@example.com" }],
    });
    (deps.userRepo.findByEmails as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 42, email: "guest@example.com", matchedEmail: "guest@example.com" },
    ]);
    const bookingStart = new Date("2025-06-15T10:00:00Z");
    const bookingEnd = new Date("2025-06-15T11:00:00Z");
    (deps.bookingRepo.findAcceptedByUserIdsOrEmails as ReturnType<typeof vi.fn>).mockResolvedValue([
      { uid: "other-booking", startTime: bookingStart, endTime: bookingEnd },
    ]);

    const result = await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });
    expect(result).toEqual([
      {
        start: bookingStart.toISOString(),
        end: bookingEnd.toISOString(),
        source: "guest-availability",
      },
    ]);
  });

  it("excludes the current booking being rescheduled", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockResolvedValue({
      attendees: [{ email: "guest@example.com" }],
    });
    (deps.userRepo.findByEmails as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 42, email: "guest@example.com", matchedEmail: "guest@example.com" },
    ]);
    (deps.bookingRepo.findAcceptedByUserIdsOrEmails as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });
    expect(deps.bookingRepo.findAcceptedByUserIdsOrEmails).toHaveBeenCalledWith(
      expect.objectContaining({ excludeUid: "uid-123" })
    );
  });

  it("includes both primary and secondary emails in booking lookup", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockResolvedValue({
      attendees: [{ email: "secondary@example.com" }],
    });
    (deps.userRepo.findByEmails as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 42, email: "primary@example.com", matchedEmail: "secondary@example.com" },
    ]);
    (deps.bookingRepo.findAcceptedByUserIdsOrEmails as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });
    expect(deps.bookingRepo.findAcceptedByUserIdsOrEmails).toHaveBeenCalledWith(
      expect.objectContaining({
        emails: expect.arrayContaining(["primary@example.com", "secondary@example.com"]),
      })
    );
  });

  it("returns empty array when an error occurs (graceful degradation)", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error")
    );
    const result = await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });
    expect(result).toEqual([]);
  });
});
