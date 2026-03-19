import type { GetServerSidePropsContext } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetServerSession = vi.fn();
const mockBuildEventUrlFromBooking = vi.fn();
const mockDetermineReschedulePreventionRedirect = vi.fn();
const mockMaybeGetBookingUidFromSeat = vi.fn();
const mockBookingFindUnique = vi.fn();
const mockEnrichUserWithItsProfile = vi.fn();

vi.mock("@calcom/features/auth/lib/getServerSession", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("@calcom/features/bookings/lib/buildEventUrlFromBooking", () => ({
  buildEventUrlFromBooking: mockBuildEventUrlFromBooking,
}));

vi.mock("@calcom/features/bookings/lib/reschedule/determineReschedulePreventionRedirect", () => ({
  determineReschedulePreventionRedirect: mockDetermineReschedulePreventionRedirect,
}));

vi.mock("@calcom/lib/server/maybeGetBookingUidFromSeat", () => ({
  maybeGetBookingUidFromSeat: mockMaybeGetBookingUidFromSeat,
}));

vi.mock("@calcom/features/users/repositories/UserRepository", () => ({
  UserRepository: class {
    enrichUserWithItsProfile = mockEnrichUserWithItsProfile;
  },
}));

vi.mock("@calcom/prisma", () => ({
  __esModule: true,
  bookingMinimalSelect: {},
  default: {
    booking: {
      findUnique: mockBookingFindUnique,
    },
  },
}));

function createContext(query: Record<string, string | undefined>): GetServerSidePropsContext {
  return {
    req: {} as GetServerSidePropsContext["req"],
    res: {} as GetServerSidePropsContext["res"],
    resolvedUrl: "/reschedule/booking-uid",
    query,
  } as unknown as GetServerSidePropsContext;
}

describe("reschedule/[uid] getServerSideProps", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetServerSession.mockResolvedValue({ user: { id: 1, email: "owner@example.com" } });
    mockBuildEventUrlFromBooking.mockResolvedValue("/john/doe-event");
    mockDetermineReschedulePreventionRedirect.mockReturnValue(null);
    mockMaybeGetBookingUidFromSeat.mockResolvedValue({
      uid: "booking-uid",
      seatReferenceUid: null,
      bookingSeat: null,
    });
    mockEnrichUserWithItsProfile.mockResolvedValue(null);
  });

  it("rescheduling a 60-minute dynamic booking preserves duration=60", async () => {
    mockBookingFindUnique.mockResolvedValue({
      uid: "booking-uid",
      userId: 1,
      responses: {},
      startTime: new Date("2026-01-10T10:00:00.000Z"),
      endTime: new Date("2026-01-10T11:00:00.000Z"),
      dynamicEventSlugRef: "dynamic-event",
      dynamicGroupSlugRef: null,
      user: null,
      status: "ACCEPTED",
      eventType: {
        users: [{ username: "john" }],
        slug: "doe-event",
        allowReschedulingPastBookings: false,
        disableRescheduling: false,
        allowReschedulingCancelledBookings: false,
        minimumRescheduleNotice: null,
        seatsPerTimeSlot: null,
        userId: 1,
        owner: { id: 1 },
        hosts: [{ user: { id: 1 } }],
        team: null,
      },
    });

    const { getServerSideProps } = await import("./getServerSideProps");
    const result = await getServerSideProps(createContext({ uid: "booking-uid" }));

    if (!("redirect" in result) || !result.redirect) throw new Error("Expected redirect result");
    const search = new URLSearchParams(result.redirect.destination.split("?")[1]);

    expect(search.get("rescheduleUid")).toBe("booking-uid");
    expect(search.get("duration")).toBe("60");
  });

  it("rescheduling a 30-minute booking keeps duration=30", async () => {
    mockBookingFindUnique.mockResolvedValue({
      uid: "booking-uid",
      userId: 1,
      responses: {},
      startTime: new Date("2026-01-10T10:00:00.000Z"),
      endTime: new Date("2026-01-10T10:30:00.000Z"),
      dynamicEventSlugRef: null,
      dynamicGroupSlugRef: null,
      user: null,
      status: "ACCEPTED",
      eventType: {
        users: [{ username: "john" }],
        slug: "thirty-min-event",
        allowReschedulingPastBookings: false,
        disableRescheduling: false,
        allowReschedulingCancelledBookings: false,
        minimumRescheduleNotice: null,
        seatsPerTimeSlot: null,
        userId: 1,
        owner: { id: 1 },
        hosts: [{ user: { id: 1 } }],
        team: null,
      },
    });

    const { getServerSideProps } = await import("./getServerSideProps");
    const result = await getServerSideProps(createContext({ uid: "booking-uid" }));

    if (!("redirect" in result) || !result.redirect) throw new Error("Expected redirect result");
    const search = new URLSearchParams(result.redirect.destination.split("?")[1]);

    expect(search.get("duration")).toBe("30");
  });

  it("includes duration query param in the generated reschedule link", async () => {
    mockBookingFindUnique.mockResolvedValue({
      uid: "booking-uid",
      userId: 1,
      responses: {},
      startTime: new Date("2026-01-10T10:00:00.000Z"),
      endTime: new Date("2026-01-10T11:00:00.000Z"),
      dynamicEventSlugRef: null,
      dynamicGroupSlugRef: null,
      user: null,
      status: "ACCEPTED",
      eventType: {
        users: [{ username: "john" }],
        slug: "event",
        allowReschedulingPastBookings: false,
        disableRescheduling: false,
        allowReschedulingCancelledBookings: false,
        minimumRescheduleNotice: null,
        seatsPerTimeSlot: null,
        userId: 1,
        owner: { id: 1 },
        hosts: [{ user: { id: 1 } }],
        team: null,
      },
    });

    const { getServerSideProps } = await import("./getServerSideProps");
    const result = await getServerSideProps(createContext({ uid: "booking-uid" }));

    if (!("redirect" in result) || !result.redirect) throw new Error("Expected redirect result");

    expect(result.redirect.destination).toContain("duration=60");
  });
});
