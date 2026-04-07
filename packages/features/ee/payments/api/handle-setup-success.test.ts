/**
 * @vitest-environment node
 *
 * Tests for the HOLD payment flow (setup_intent.succeeded) in the Stripe webhook handler.
 *
 * Verifies that handleSetupSuccess does NOT call EventManager.create directly,
 * and instead delegates event/meeting creation entirely to handleConfirmation —
 * matching the ON_BOOKING (charge) path in handlePaymentSuccess.
 */
import { BookingStatus } from "@calcom/prisma/enums";
import type { NextApiRequest, NextApiResponse } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("micro", () => ({
  buffer: vi.fn(),
}));
vi.mock("@calcom/features/ee/payments/server/stripe", () => ({
  default: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));
vi.mock("@calcom/app-store/_utils/payments/handlePaymentSuccess");
vi.mock("@calcom/features/bookings/lib/payment/getBooking");
vi.mock("@calcom/features/bookings/lib/handleConfirmation");
vi.mock("@calcom/features/bookings/lib/doesBookingRequireConfirmation");
vi.mock("@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials", () => ({
  getAllCredentialsIncludeServiceAccountKey: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/features/bookings/lib/EventManager", () => {
  const mockCreate = vi.fn().mockResolvedValue({ referencesToCreate: [] });
  return {
    default: vi.fn().mockImplementation(() => ({ create: mockCreate })),
    placeholderCreatedEvent: { referencesToCreate: [] },
    __mockCreate: mockCreate,
  };
});

vi.mock("@calcom/features/platform-oauth-client/platform-oauth-client.repository", () => ({
  PlatformOAuthClientRepository: class {
    constructor() {}
    getByUserId = vi.fn().mockResolvedValue(null);
  },
}));
vi.mock("@calcom/features/platform-oauth-client/get-platform-params");
vi.mock("@calcom/emails/email-manager");
vi.mock("@calcom/app-store/_utils/getAppActor", () => ({
  getAppActor: vi.fn().mockReturnValue({ type: "system", id: "stripe" }),
}));
vi.mock("@calcom/app-store/zod-utils", () => ({
  eventTypeMetaDataSchemaWithTypedApps: { parse: vi.fn().mockReturnValue({}) },
  eventTypeAppMetadataOptionalSchema: { parse: vi.fn().mockReturnValue({}) },
}));

vi.mock("@calcom/prisma", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/prisma")>();
  const mockPrisma = {
    ...actual.default,
    payment: {
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  return {
    ...actual,
    default: mockPrisma,
    prisma: mockPrisma,
  };
});

vi.mock("@calcom/lib/tracing/factory", () => ({
  distributedTracing: {
    createTrace: vi.fn(() => ({ traceId: "trace", spanId: "span", operation: "op" })),
    updateTrace: vi.fn(() => ({ traceId: "trace", spanId: "span", operation: "op" })),
  },
}));
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));
vi.mock("@calcom/lib/server/getServerErrorFromUnknown", () => ({
  getServerErrorFromUnknown: (err: unknown) => {
    const e = err as { statusCode?: number; message?: string };
    return {
      statusCode: e?.statusCode ?? 500,
      message: e?.message ?? "Unknown error",
      cause: err,
    };
  },
}));

// --- Imports (after mocks) ---

import { sendAttendeeRequestEmailAndSMS, sendOrganizerRequestEmail } from "@calcom/emails/email-manager";
// biome-ignore lint/style/noRestrictedImports: test file needs direct import
import { doesBookingRequireConfirmation } from "@calcom/features/bookings/lib/doesBookingRequireConfirmation";
import EventManager from "@calcom/features/bookings/lib/EventManager";
// biome-ignore lint/style/noRestrictedImports: test file needs direct import
import { handleConfirmation } from "@calcom/features/bookings/lib/handleConfirmation";
// biome-ignore lint/style/noRestrictedImports: test file needs direct import
import { getBooking } from "@calcom/features/bookings/lib/payment/getBooking";
import { prisma } from "@calcom/prisma";

// Access the mock create function exposed via the EventManager mock
const { __mockCreate: mockEventManagerCreate } = (await import(
  "@calcom/features/bookings/lib/EventManager"
)) as any;

// --- Helpers ---

const mockBuffer = vi.mocked(await import("micro")).buffer;
const mockConstructEvent = vi.mocked(
  (await import("@calcom/features/ee/payments/server/stripe")).default.webhooks.constructEvent
);

async function loadHandler() {
  return (await import("./webhook")).default;
}

function createReq(
  overrides: Partial<NextApiRequest> & { method?: string; headers?: Record<string, string> }
): NextApiRequest {
  return {
    method: "POST",
    headers: {},
    ...overrides,
  } as unknown as NextApiRequest;
}

function createRes(): NextApiResponse {
  const res = {
    statusCode: 200,
    status: vi.fn(function (this: { statusCode: number }, code: number) {
      this.statusCode = code;
      return res;
    }),
    send: vi.fn(),
    json: vi.fn(),
  };
  return res as unknown as NextApiResponse;
}

// --- Test Data ---

const mockBooking = {
  id: 1,
  userId: 1,
  eventTypeId: 10,
  status: BookingStatus.PENDING,
  uid: "test-uid",
  location: "integrations:daily",
  smsReminderNumber: null,
  userPrimaryEmail: "user@example.com",
  title: "Test Event",
  description: "Test Description",
  customInputs: {},
  startTime: new Date("2025-01-01T10:00:00Z"),
  endTime: new Date("2025-01-01T10:30:00Z"),
  attendees: [],
  responses: {},
  metadata: null,
  paid: false,
  destinationCalendar: null,
  eventType: {
    id: 10,
    title: "Test Event",
    description: "Test Description",
    slug: "test-event",
    price: 1000,
    currency: "USD",
    length: 30,
    requiresConfirmation: false,
    teamId: null,
    parentId: null,
    schedulingType: null,
    hosts: [],
    owner: { hideBranding: false },
    metadata: {},
  },
};

const mockUser = {
  id: 1,
  email: "user@example.com",
  name: "Test User",
  username: "testuser",
  timeZone: "UTC",
  isPlatformManaged: false,
  credentials: [],
  locale: "en",
  timeFormat: 12,
  destinationCalendar: null,
};

const mockEvt = {
  type: "test-event",
  title: "Test Event",
  startTime: "2025-01-01T10:00:00Z",
  endTime: "2025-01-01T10:30:00Z",
  organizer: {
    email: "user@example.com",
    name: "Test User",
    timeZone: "UTC",
    language: { locale: "en", translate: vi.fn() },
    id: 1,
  },
  attendees: [
    {
      email: "attendee@example.com",
      name: "Attendee",
      timeZone: "UTC",
      language: { locale: "en", translate: vi.fn() },
    },
  ],
  uid: "test-uid",
  bookingId: 1,
};

const mockEventType = {
  id: 10,
  metadata: {},
};

// --- Tests ---

describe("handleSetupSuccess (HOLD payment flow)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, STRIPE_WEBHOOK_SECRET: "whsec_test_secret", NEXT_PUBLIC_IS_E2E: "1" };

    vi.mocked(getBooking).mockResolvedValue({
      booking: mockBooking,
      user: mockUser,
      evt: mockEvt,
      eventType: mockEventType,
    } as any);

    vi.mocked(prisma.payment.findFirst).mockResolvedValue({
      id: 1,
      bookingId: 1,
      data: { someData: true },
      externalId: "seti_123",
    } as any);

    vi.mocked(prisma.payment.update).mockResolvedValue({} as any);
    vi.mocked(doesBookingRequireConfirmation).mockReturnValue(false);
    vi.mocked(handleConfirmation).mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  async function fireSetupIntentSucceeded() {
    const req = createReq({ headers: { "stripe-signature": "t=1,v1=x" } });
    const res = createRes();
    mockBuffer.mockResolvedValue(
      Buffer.from(JSON.stringify({ id: "evt_1", type: "setup_intent.succeeded" }))
    );
    mockConstructEvent.mockReturnValue({
      id: "evt_1",
      type: "setup_intent.succeeded",
      account: "acct_test",
      data: { object: { id: "seti_123" } },
    } as any);

    const handler = await loadHandler();
    await handler(req, res);
    return res;
  }

  it("should NOT call EventManager.create — delegates to handleConfirmation only", async () => {
    await fireSetupIntentSucceeded();

    expect(vi.mocked(EventManager)).not.toHaveBeenCalled();
    expect(mockEventManagerCreate).not.toHaveBeenCalled();
  });

  it("should call handleConfirmation with correct params when !requiresConfirmation", async () => {
    vi.mocked(doesBookingRequireConfirmation).mockReturnValue(false);

    await fireSetupIntentSucceeded();

    expect(handleConfirmation).toHaveBeenCalledTimes(1);
    expect(handleConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        evt: mockEvt,
        bookingId: mockBooking.id,
        booking: mockBooking,
        paid: true,
        actionSource: "WEBHOOK",
      })
    );
  });

  it("should set paid and ACCEPTED status via payment update when !requiresConfirmation", async () => {
    vi.mocked(doesBookingRequireConfirmation).mockReturnValue(false);

    await fireSetupIntentSucceeded();

    expect(vi.mocked(prisma.payment.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          booking: {
            update: expect.objectContaining({
              paid: true,
              status: BookingStatus.ACCEPTED,
            }),
          },
        }),
      })
    );

    const updateCall = vi.mocked(prisma.payment.update).mock.calls[0][0];
    expect((updateCall as any).data.booking.update).not.toHaveProperty("references");
  });

  it("should NOT call handleConfirmation when requiresConfirmation is true", async () => {
    vi.mocked(doesBookingRequireConfirmation).mockReturnValue(true);

    await fireSetupIntentSucceeded();

    expect(handleConfirmation).not.toHaveBeenCalled();
  });

  it("should send request emails when requiresConfirmation is true", async () => {
    vi.mocked(doesBookingRequireConfirmation).mockReturnValue(true);

    await fireSetupIntentSucceeded();

    expect(sendOrganizerRequestEmail).toHaveBeenCalled();
    expect(sendAttendeeRequestEmailAndSMS).toHaveBeenCalled();
  });

  it("should not set ACCEPTED status when requiresConfirmation is true", async () => {
    vi.mocked(doesBookingRequireConfirmation).mockReturnValue(true);

    await fireSetupIntentSucceeded();

    const updateCall = vi.mocked(prisma.payment.update).mock.calls[0][0];
    expect((updateCall as any).data.booking.update).not.toHaveProperty("status");
    expect((updateCall as any).data.booking.update.paid).toBe(true);
  });
});
