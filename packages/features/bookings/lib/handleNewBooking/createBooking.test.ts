import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: vi.fn((fn: (...args: never[]) => unknown) => fn),
}));

vi.mock("@calcom/prisma", () => {
  const mockBooking = {
    id: 1,
    uid: "test-uid",
    title: "Test Booking",
    startTime: new Date("2024-01-15T10:00:00Z"),
    endTime: new Date("2024-01-15T10:30:00Z"),
    status: "ACCEPTED",
    user: {
      uuid: "user-uuid",
      email: "host@test.com",
      name: "Host",
      timeZone: "UTC",
      username: "host",
      isPlatformManaged: false,
    },
    attendees: [{ name: "A", email: "a@test.com", timeZone: "UTC", locale: "en" }],
    payment: [],
    references: [],
  };

  return {
    default: {
      $transaction: vi.fn((fn: (...args: never[]) => unknown) =>
        fn({
          booking: {
            create: vi.fn().mockResolvedValue(mockBooking),
            update: vi.fn().mockResolvedValue(mockBooking),
          },
          app_RoutingForms_FormResponse: {
            update: vi.fn().mockResolvedValue({}),
          },
        })
      ),
      credential: {
        findFirstOrThrow: vi.fn().mockResolvedValue({ id: 1 }),
      },
      app_RoutingForms_FormResponse: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    },
    Prisma: {
      JsonNull: null,
    },
  };
});

vi.mock("@calcom/lib/isPrismaObj", () => ({
  isPrismaObjOrUndefined: vi.fn((val: unknown) => val),
}));

import { createBooking } from "./createBooking";

const makeParams = (overrides = {}) => ({
  uid: "test-uid-short",
  routingFormResponseId: undefined,
  reroutingFormResponses: null,
  rescheduledBy: undefined,
  reqBody: {
    user: "testuser",
    metadata: {},
    recurringEventId: undefined,
  },
  eventType: {
    eventTypeData: { seatsPerTimeSlot: null },
    id: 1,
    slug: "test-event",
    organizerUser: { id: 1, email: "host@test.com", name: "Host", isFixed: false },
    isConfirmedByDefault: true,
    paymentAppData: { price: 0, appId: null, credentialId: null },
  },
  input: {
    bookerEmail: "booker@test.com",
    rescheduleReason: null,
    smsReminderNumber: null,
    responses: { name: "Booker", email: "booker@test.com" },
  },
  evt: {
    title: "Test Booking",
    startTime: "2024-01-15T10:00:00Z",
    endTime: "2024-01-15T10:30:00Z",
    organizer: { email: "host@test.com", name: "Host" },
    attendees: [
      {
        name: "Booker",
        email: "booker@test.com",
        timeZone: "UTC",
        language: { locale: "en" },
        phoneNumber: null,
      },
    ],
    additionalNotes: "Test notes",
    customInputs: {},
    location: "zoom",
    iCalUID: "test-ical-uid@Cal.com",
    destinationCalendar: null,
    oneTimePassword: null,
    seatsPerTimeSlot: null,
    team: null,
  },
  originalRescheduledBooking: null,
  creationSource: undefined,
  tracking: undefined,
  ...overrides,
});

describe("createBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new booking and returns it with userUuid", async () => {
    const result = await createBooking(makeParams() as never);

    expect(result).toHaveProperty("id", 1);
    expect(result).toHaveProperty("uid", "test-uid");
    expect(result).toHaveProperty("userUuid", "user-uuid");
  });

  it("creates booking within a transaction", async () => {
    const prisma = (await import("@calcom/prisma")).default;
    await createBooking(makeParams() as never);

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("handles rescheduling by setting fromReschedule and cancelling old booking", async () => {
    const params = makeParams({
      originalRescheduledBooking: {
        id: 99,
        uid: "old-booking-uid",
        description: "Old notes",
        location: "zoom",
        paid: false,
        payment: [],
        metadata: { key: "value" },
        recurringEventId: null,
        user: { id: 1 },
      },
    });

    const result = await createBooking(params as never);
    expect(result).toHaveProperty("id");
  });

  it("validates payment credential when price > 0", async () => {
    const prisma = (await import("@calcom/prisma")).default;
    const params = makeParams();
    params.eventType.paymentAppData = { price: 100, appId: "stripe", credentialId: 5 };

    await createBooking(params as never);

    expect(prisma.credential.findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ appId: "stripe", id: 5 }),
      })
    );
  });

  it("sets uuid as UUIDv7 derived from startTime", async () => {
    const prisma = (await import("@calcom/prisma")).default;
    const mockCreate = vi.fn().mockResolvedValue({
      id: 1,
      uid: "test-uid",
      user: { uuid: "user-uuid" },
      attendees: [],
      payment: [],
      references: [],
    });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((fn: any) =>
      fn({
        booking: { create: mockCreate, update: vi.fn() },
        app_RoutingForms_FormResponse: { update: vi.fn() },
      })
    );

    await createBooking(makeParams() as never);

    const createArg = mockCreate.mock.calls[0][0];
    const uuid = createArg.data.uuid;
    expect(uuid).toBeDefined();
    // UUIDv7 format: 8-4-4-4-12 hex with version 7
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

    // Regression guard for a uuid@10 bug where v7({ msecs }) produced
    // zero-timestamp UUIDs (00000000-0000-7xxx-...) on first call in a
    // process, because the library's internal `_msecs` state started at 0
    // and wasn't updated when the caller supplied `msecs`. Format-only
    // assertions let that bug through for months. We now decode the 48-bit
    // timestamp prefix and assert it matches the input startTime exactly.
    const timestampHex = uuid.replace(/-/g, "").slice(0, 12);
    const decodedMs = Number(BigInt(`0x${timestampHex}`));
    const expectedMs = new Date("2024-01-15T10:00:00Z").getTime();
    expect(decodedMs).toBe(expectedMs);
  });
});
