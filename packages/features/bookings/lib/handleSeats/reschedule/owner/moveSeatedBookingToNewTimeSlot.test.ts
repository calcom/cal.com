import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/emails/email-manager", () => ({
  sendRescheduledEmailsAndSMS: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    booking: {
      update: vi.fn().mockResolvedValue({
        id: 1,
        references: [],
        payment: [],
        attendees: [],
        user: { uuid: "u-1" },
        appsStatus: undefined,
      }),
    },
  };
  return { default: mockPrisma };
});

vi.mock("../../../handleNewBooking/addVideoCallDataToEvent", () => ({
  addVideoCallDataToEvent: vi.fn((_refs, evt) => evt),
}));

vi.mock("../../../handleNewBooking/findBookingQuery", () => ({
  findBookingQuery: vi.fn().mockResolvedValue({ uid: "found-uid", title: "Found" }),
}));

vi.mock("../../../handleNewBooking/handleAppsStatus", () => ({
  handleAppsStatus: vi.fn().mockReturnValue([]),
}));

import { sendRescheduledEmailsAndSMS } from "@calcom/emails/email-manager";
import moveSeatedBookingToNewTimeSlot from "./moveSeatedBookingToNewTimeSlot";

const makeRescheduleObject = (overrides = {}) => ({
  rescheduleReason: "time change",
  rescheduleUid: "reschedule-uid",
  eventType: { description: "Test event", metadata: null },
  organizerUser: { name: "Host", id: 1 },
  reqAppsStatus: [],
  noEmail: false,
  isConfirmedByDefault: true,
  additionalNotes: "some notes",
  evt: {
    title: "Test",
    startTime: "2024-01-16T10:00:00Z",
    endTime: "2024-01-16T10:30:00Z",
    attendees: [],
    organizer: { email: "host@test.com", name: "Host", timeZone: "UTC" },
    bookerUrl: "https://cal.com",
    description: "Original description",
  },
  ...overrides,
});

const makeSeatedBooking = () => ({ id: 1, uid: "seated-uid", attendees: [] });

const makeEventManager = () => ({
  reschedule: vi.fn().mockResolvedValue({
    results: [{ type: "google_calendar", success: true, updatedEvent: { iCalUID: "ical-uid" } }],
  }),
});

const makeLogger = () => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
});

describe("moveSeatedBookingToNewTimeSlot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns booking with appsStatus", async () => {
    const result = await moveSeatedBookingToNewTimeSlot(
      makeRescheduleObject() as never,
      makeSeatedBooking() as never,
      makeEventManager() as never,
      makeLogger() as never
    );
    expect(result).toHaveProperty("uid", "found-uid");
  });

  it("sends reschedule emails when noEmail is false and confirmed", async () => {
    await moveSeatedBookingToNewTimeSlot(
      makeRescheduleObject() as never,
      makeSeatedBooking() as never,
      makeEventManager() as never,
      makeLogger() as never
    );
    expect(sendRescheduledEmailsAndSMS).toHaveBeenCalled();
  });

  it("skips emails when noEmail is true", async () => {
    await moveSeatedBookingToNewTimeSlot(
      makeRescheduleObject({ noEmail: true }) as never,
      makeSeatedBooking() as never,
      makeEventManager() as never,
      makeLogger() as never
    );
    expect(sendRescheduledEmailsAndSMS).not.toHaveBeenCalled();
  });

  it("logs error when event manager results contain failures", async () => {
    const eventManager = {
      reschedule: vi.fn().mockResolvedValue({
        results: [{ type: "google_calendar", success: false, updatedEvent: {} }],
      }),
    };
    const logger = makeLogger();
    await moveSeatedBookingToNewTimeSlot(
      makeRescheduleObject() as never,
      makeSeatedBooking() as never,
      eventManager as never,
      logger as never
    );
    expect(logger.error).toHaveBeenCalled();
  });
});
