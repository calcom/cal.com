import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GuestBusyTimesDeps } from "./util";
import { getGuestBusyTimesForReschedule } from "./util";

function createMockDeps(): GuestBusyTimesDeps {
  return {
    bookingRepo: {
      findByUidIncludeEventType: vi.fn(),
      findAcceptedBookingsByUserIdsOrEmails: vi.fn(),
    },
    userRepo: {
      findUsersByEmails: vi.fn(),
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

  it("returns empty array when booking has no attendees", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockResolvedValue({
      attendees: [],
    });

    const result = await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });
    expect(result).toEqual([]);
    expect(deps.userRepo.findUsersByEmails).not.toHaveBeenCalled();
  });

  it("returns empty array when booking is not found", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });
    expect(result).toEqual([]);
  });

  it("returns empty array when all attendees are hosts", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockResolvedValue({
      attendees: [{ email: "host@example.com" }],
    });

    const result = await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });
    expect(result).toEqual([]);
    expect(deps.userRepo.findUsersByEmails).not.toHaveBeenCalled();
  });

  it("filters host emails case-insensitively", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockResolvedValue({
      attendees: [{ email: "HOST@EXAMPLE.COM" }],
    });

    const result = await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });
    expect(result).toEqual([]);
  });

  it("returns empty array when no Cal.com users found for guest emails", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockResolvedValue({
      attendees: [{ email: "guest@external.com" }],
    });
    (deps.userRepo.findUsersByEmails as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });
    expect(result).toEqual([]);
    expect(deps.bookingRepo.findAcceptedBookingsByUserIdsOrEmails).not.toHaveBeenCalled();
  });

  it("returns busy times for guest Cal.com users", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockResolvedValue({
      attendees: [{ email: "host@example.com" }, { email: "guest@cal.com" }],
    });
    (deps.userRepo.findUsersByEmails as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 10, email: "guest@cal.com" },
    ]);
    (deps.bookingRepo.findAcceptedBookingsByUserIdsOrEmails as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        uid: "booking-456",
        startTime: new Date("2025-06-15T10:00:00Z"),
        endTime: new Date("2025-06-15T11:00:00Z"),
      },
    ]);

    const result = await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });

    expect(result).toEqual([
      {
        start: "2025-06-15T10:00:00.000Z",
        end: "2025-06-15T11:00:00.000Z",
        source: "guest-availability",
      },
    ]);
  });

  it("excludes the reschedule booking uid", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockResolvedValue({
      attendees: [{ email: "guest@cal.com" }],
    });
    (deps.userRepo.findUsersByEmails as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 10, email: "guest@cal.com" },
    ]);
    (deps.bookingRepo.findAcceptedBookingsByUserIdsOrEmails as ReturnType<typeof vi.fn>).mockResolvedValue(
      []
    );

    await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });

    expect(deps.bookingRepo.findAcceptedBookingsByUserIdsOrEmails).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeUid: "uid-123",
      })
    );
  });

  it("returns empty array on error (graceful degradation)", async () => {
    (deps.bookingRepo.findByUidIncludeEventType as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB connection failed")
    );

    const result = await getGuestBusyTimesForReschedule({ ...baseArgs, ...deps });
    expect(result).toEqual([]);
  });
});
