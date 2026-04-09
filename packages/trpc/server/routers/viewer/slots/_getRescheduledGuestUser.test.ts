import { beforeEach, describe, expect, it, vi } from "vitest";

import { SchedulingType } from "@calcom/prisma/enums";
import type { IAvailableSlotsService } from "./util";
import { AvailableSlotsService } from "./util";

describe("AvailableSlotsService - _getRescheduledGuestUser", () => {
  let service: AvailableSlotsService;
  let mockDependencies: {
    bookingRepo: {
      findByUidIncludeEventTypeAttendeesAndUser: ReturnType<typeof vi.fn>;
    };
    userRepo: {
      findAvailabilityUserByEmail: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDependencies = {
      bookingRepo: {
        findByUidIncludeEventTypeAttendeesAndUser: vi.fn(),
      },
      userRepo: {
        findAvailabilityUserByEmail: vi.fn(),
      },
    };

    service = new AvailableSlotsService(mockDependencies as unknown as IAvailableSlotsService);
  });

  it("returns null when rescheduleUid is missing", async () => {
    const result = await (service as any)._getRescheduledGuestUser({
      rescheduleUid: null,
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.ROUND_ROBIN,
    });

    expect(result).toBeNull();
    expect(mockDependencies.bookingRepo.findByUidIncludeEventTypeAttendeesAndUser).not.toHaveBeenCalled();
  });

  it("returns null for collective events", async () => {
    const result = await (service as any)._getRescheduledGuestUser({
      rescheduleUid: "booking-uid",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.COLLECTIVE,
    });

    expect(result).toBeNull();
    expect(mockDependencies.bookingRepo.findByUidIncludeEventTypeAttendeesAndUser).not.toHaveBeenCalled();
  });

  it("returns null when booking is not found", async () => {
    mockDependencies.bookingRepo.findByUidIncludeEventTypeAttendeesAndUser.mockResolvedValue(null);

    const result = await (service as any)._getRescheduledGuestUser({
      rescheduleUid: "booking-uid",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.ROUND_ROBIN,
    });

    expect(result).toBeNull();
    expect(mockDependencies.bookingRepo.findByUidIncludeEventTypeAttendeesAndUser).toHaveBeenCalledWith({
      bookingUid: "booking-uid",
    });
  });

  it("returns null when attendee is not a Cal.com user", async () => {
    mockDependencies.bookingRepo.findByUidIncludeEventTypeAttendeesAndUser.mockResolvedValue({
      attendees: [{ email: "guest@example.com" }],
    });
    mockDependencies.userRepo.findAvailabilityUserByEmail.mockResolvedValue(null);

    const result = await (service as any)._getRescheduledGuestUser({
      rescheduleUid: "booking-uid",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.ROUND_ROBIN,
    });

    expect(result).toBeNull();
    expect(mockDependencies.userRepo.findAvailabilityUserByEmail).toHaveBeenCalledWith({
      email: "guest@example.com",
    });
  });

  it("returns null when attendee user is locked", async () => {
    mockDependencies.bookingRepo.findByUidIncludeEventTypeAttendeesAndUser.mockResolvedValue({
      attendees: [{ email: "guest@example.com" }],
    });
    mockDependencies.userRepo.findAvailabilityUserByEmail.mockResolvedValue({
      id: 42,
      email: "guest@example.com",
      locked: true,
      credentials: [],
    });

    const result = await (service as any)._getRescheduledGuestUser({
      rescheduleUid: "booking-uid",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.ROUND_ROBIN,
    });

    expect(result).toBeNull();
  });

  it("excludes organizer emails and returns the guest availability user", async () => {
    mockDependencies.bookingRepo.findByUidIncludeEventTypeAttendeesAndUser.mockResolvedValue({
      attendees: [{ email: "HOST@example.com" }, { email: "guest@example.com" }],
    });
    mockDependencies.userRepo.findAvailabilityUserByEmail.mockResolvedValue({
      id: 42,
      email: "guest@example.com",
      locked: false,
      credentials: [{ id: 1, key: {} }],
      timeZone: "UTC",
    });

    const result = await (service as any)._getRescheduledGuestUser({
      rescheduleUid: "booking-uid",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.ROUND_ROBIN,
    });

    expect(mockDependencies.userRepo.findAvailabilityUserByEmail).toHaveBeenCalledWith({
      email: "guest@example.com",
    });
    expect(result).toMatchObject({
      id: 42,
      email: "guest@example.com",
      credentials: [{ id: 1, key: {} }],
    });
  });
});
