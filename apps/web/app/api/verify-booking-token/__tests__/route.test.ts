import type { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { confirmHandler } from "@calcom/trpc/server/routers/viewer/bookings/confirm.handler";
import type { Mock } from "vitest";
const mockConfirmHandler = confirmHandler as unknown as Mock<typeof confirmHandler>;

vi.mock("app/api/defaultResponderForAppDir", () => ({
  defaultResponderForAppDir:
    (handler: (req: NextRequest) => Promise<Response>) =>
    (req: NextRequest, _context: { params: Promise<Record<string, string>> }) =>
      handler(req),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
  cookies: vi.fn().mockResolvedValue({ getAll: () => [] }),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: vi.fn((url: string | URL, init?: { status?: number }) => {
      const location = typeof url === "string" ? url : url.toString();
      return {
        status: init?.status ?? 302,
        headers: {
          get: (name: string) => (name.toLowerCase() === "location" ? location : null),
        },
      } as unknown as Response;
    }),
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    booking: {
      findUnique: vi.fn().mockImplementation(({ where }: { where: { oneTimePassword: string } }) => {
        const booking = Object.values(DB.bookings).find(
          (booking) => booking.oneTimePassword === where.oneTimePassword
        );
        return Promise.resolve(booking ?? null);
      }),
      update: vi
        .fn()
        .mockImplementation(({ where }: { where: { id: number }; data: { oneTimePassword: null } }) => {
          const booking = DB.bookings[where.id];
          return Promise.resolve(booking ?? null);
        }),
    },
    user: {
      findUniqueOrThrow: vi.fn().mockImplementation(({ where }: { where: { id: number } }) => {
        const user = Object.values(DB.users).find((user) => user.id === where.id);
        return Promise.resolve(user ?? null);
      }),
    },
  },
}));

vi.mock("@calcom/trpc/server/routers/viewer/bookings/confirm.handler", () => ({
  confirmHandler: vi.fn(),
}));

vi.mock("@calcom/lib/tracing/factory", () => ({
  distributedTracing: {
    createTrace: vi.fn().mockReturnValue({}),
  },
}));

vi.mock("@calcom/features/booking-audit/lib/makeActor", () => ({
  makeUserActor: vi.fn().mockReturnValue({ type: "user", id: "test-uuid" }),
}));

// Store for mock request body - will be set by tests
let mockRequestBody: Record<string, unknown> = {};

vi.mock("app/api/parseRequestData", () => ({
  parseRequestData: vi.fn().mockImplementation(() => Promise.resolve(mockRequestBody)),
}));

function setMockRequestBody(body: Record<string, unknown>) {
  mockRequestBody = body;
}

function expectErrorRedirect(res: Response, path: string, error: string) {
  const location = res.headers.get("location");
  expect(location).toBeTruthy();
  const redirectUrl = new URL(location!);
  expect(redirectUrl.pathname).toBe(path);
  expect(redirectUrl.searchParams.get("error")).toBe(error);
}

// Import after mocks are set up
import { GET, POST } from "../route";
const DB = {
  bookings: {} as Record<
    string,
    {
      id: number;
      uid: string;
      oneTimePassword: string;
      recurringEventId?: string | null;
    }
  >,
  users: {} as Record<
    string,
    {
      id: number;
      uuid: string;
      email: string;
      username: string;
      role: string;
      destinationCalendar: unknown | null;
    }
  >,
};
function createMockBooking(overrides: {
  id: number;
  uid: string;
  oneTimePassword: string;
  recurringEventId?: string | null;
}) {
  DB.bookings[overrides.uid] = {
    id: overrides.id,
    uid: overrides.uid,
    oneTimePassword: overrides.oneTimePassword,
    recurringEventId: overrides.recurringEventId ?? null,
  };
}

function createMockUser(overrides: {
  id: number;
  uuid: string;
  email: string;
  username: string;
  role: string;
  destinationCalendar: unknown | null;
}) {
  DB.users[overrides.uuid] = {
    id: overrides.id,
    uuid: overrides.uuid,
    email: overrides.email,
    username: overrides.username ?? null,
    role: overrides.role ?? "USER",
    destinationCalendar: overrides.destinationCalendar ?? null,
  };
}

const createMockRequest = (
  url: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>
): NextRequest => {
  const urlObj = new URL(url);
  const headers = new Headers();
  headers.set("content-type", "application/json");
  return {
    method,
    url,
    nextUrl: {
      searchParams: urlObj.searchParams,
    },
    headers,
    json:
      method === "POST"
        ? async () => {
            process.stdout.write("json fn called: " + JSON.stringify(body));
            return Promise.resolve(body ?? {});
          }
        : undefined,
  } as unknown as NextRequest;
};

describe("verify-booking-token route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock body and DB
    setMockRequestBody({});
    Object.keys(DB.bookings).forEach((key) => delete DB.bookings[key]);
    Object.keys(DB.users).forEach((key) => delete DB.users[key]);
  });

  describe("GET handler", () => {
    it("should redirect to booking page with error when action is reject (requires POST)", async () => {
      const baseUrl =
        "https://app.example.com/api/verify-booking-token?action=reject&token=test-token&bookingUid=abc123&userId=42";
      const req = createMockRequest(baseUrl, "GET");
      const res = await GET(req, { params: Promise.resolve({}) });
      const location = res.headers.get("location");

      expect(location).toBeTruthy();
      const redirectUrl = new URL(location!);

      expect(redirectUrl.origin).toBe("https://app.example.com");
      expect(redirectUrl.pathname).toBe("/booking/abc123");
      expect(redirectUrl.searchParams.get("error")).toBe("Rejection requires POST method");
    });

    it("should redirect with error when query params are invalid (missing action)", async () => {
      const baseUrl =
        "https://app.example.com/api/verify-booking-token?token=test-token&bookingUid=abc123&userId=42";
      const req = createMockRequest(baseUrl, "GET");

      const res = await GET(req, { params: Promise.resolve({}) });
      const location = res.headers.get("location");

      expect(location).toBeTruthy();
      const redirectUrl = new URL(location!);

      expect(redirectUrl.origin).toBe("https://app.example.com");
      expect(redirectUrl.pathname).toBe("/booking/abc123");
      expect(redirectUrl.searchParams.get("error")).toBe("Error confirming booking");
    });

    it("should redirect with error when query params are invalid (missing token)", async () => {
      const baseUrl =
        "https://app.example.com/api/verify-booking-token?action=accept&bookingUid=abc123&userId=42";
      const req = createMockRequest(baseUrl, "GET");

      const res = await GET(req, { params: Promise.resolve({}) });
      const location = res.headers.get("location");

      expect(location).toBeTruthy();
      const redirectUrl = new URL(location!);

      expect(redirectUrl.origin).toBe("https://app.example.com");
      expect(redirectUrl.pathname).toBe("/booking/abc123");
      expect(redirectUrl.searchParams.get("error")).toBe("Error confirming booking");
    });

    it("should preserve the request origin in redirect URL (not hardcode localhost)", async () => {
      const baseUrl =
        "https://custom-domain.example.org/api/verify-booking-token?action=reject&token=t&bookingUid=booking-uid&userId=1";
      const req = createMockRequest(baseUrl, "GET");

      const res = await GET(req, { params: Promise.resolve({}) });
      const location = res.headers.get("location");

      expect(location).toBeTruthy();
      const redirectUrl = new URL(location!);

      expect(redirectUrl.origin).toBe("https://custom-domain.example.org");
      expect(location).not.toContain("localhost");
    });

    it("should handle empty bookingUid in error case", async () => {
      const baseUrl = "https://app.example.com/api/verify-booking-token?token=test-token&userId=42";
      const req = createMockRequest(baseUrl, "GET");

      const res = await GET(req, { params: Promise.resolve({}) });
      const location = res.headers.get("location");

      expect(location).toBeTruthy();
      const redirectUrl = new URL(location!);

      expect(redirectUrl.pathname).toBe("/booking/");
      expect(redirectUrl.searchParams.get("error")).toBe("Error confirming booking");
    });
  });

  describe("POST handler", () => {
    it("should redirect with status 303 when query params are invalid", async () => {
      const baseUrl =
        "https://app.example.com/api/verify-booking-token?token=test-token&bookingUid=abc123&userId=42&action=reject";
      const req = createMockRequest(baseUrl, "POST");

      const res = await POST(req, { params: Promise.resolve({}) });

      expect(res.status).toBe(303);

      const location = res.headers.get("location");
      expect(location).toBeTruthy();
      const redirectUrl = new URL(location!);

      expect(redirectUrl.origin).toBe("https://app.example.com");
      expect(redirectUrl.pathname).toBe("/booking/abc123");
      expect(redirectUrl.searchParams.get("error")).toBe("Error confirming booking");
    });

    it("should preserve the request origin in POST redirect URL", async () => {
      const baseUrl =
        "https://self-hosted.company.com/api/verify-booking-token?bookingUid=uid123&token=t&userId=1&action=reject";
      const req = createMockRequest(baseUrl, "POST");

      const res = await POST(req, { params: Promise.resolve({}) });
      const location = res.headers.get("location");

      expect(location).toBeTruthy();
      const redirectUrl = new URL(location!);

      expect(redirectUrl.origin).toBe("https://self-hosted.company.com");
      expect(location).not.toContain("localhost");
    });
  });

  describe("redirect URL construction", () => {
    it("should construct redirect URLs relative to the request URL, not hardcoded origins", async () => {
      const testOrigins = [
        "https://app.cal.com",
        "https://acme.cal.com",
        "https://calcom.company.internal",
        "http://192.168.1.100:3000",
      ];

      for (const origin of testOrigins) {
        vi.clearAllMocks();
        const baseUrl = `${origin}/api/verify-booking-token?action=reject&token=t&bookingUid=test-uid&userId=1`;
        const req = createMockRequest(baseUrl, "GET");

        const res = await GET(req, { params: Promise.resolve({}) });
        const location = res.headers.get("location");

        expect(location).toBeTruthy();
        const redirectUrl = new URL(location!);

        expect(redirectUrl.origin).toBe(origin);
        expect(redirectUrl.pathname).toBe("/booking/test-uid");
      }
    });
  });

  describe("successful booking confirmation", () => {
    it("should call confirmHandler with correct arguments for accept action", async () => {
      createMockBooking({
        id: 1,
        uid: "booking-uid",
        oneTimePassword: "valid-token",
        recurringEventId: null,
      });
      createMockUser({
        id: 42,
        uuid: "user-uuid",
        email: "test@example.com",
        username: "testuser",
        role: "USER",
        destinationCalendar: null,
      });

      const req = createMockRequest(
        "https://app.example.com/api/verify-booking-token?action=accept&token=valid-token&bookingUid=booking-uid&userId=42",
        "GET"
      );
      await GET(req, { params: Promise.resolve({}) });

      expect(mockConfirmHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            bookingId: 1,
            confirmed: true,
            emailsEnabled: true,
            actionSource: "MAGIC_LINK",
          }),
        })
      );
    });

    it("should redirect with error when booking not found", async () => {
      createMockUser({
        id: 42,
        uuid: "user-uuid",
        email: "test@example.com",
        username: "testuser",
        role: "USER",
        destinationCalendar: null,
      });

      const req = createMockRequest(
        "https://app.example.com/api/verify-booking-token?action=accept&token=invalid-token&bookingUid=booking-uid&userId=42",
        "GET"
      );
      const res = await GET(req, { params: Promise.resolve({}) });

      expectErrorRedirect(res, "/booking/booking-uid", "Error confirming booking");
      expect(mockConfirmHandler).not.toHaveBeenCalled();
    });

    it("should redirect with error when user not found", async () => {
      createMockBooking({
        id: 1,
        uid: "booking-uid",
        oneTimePassword: "valid-token",
      });

      const req = createMockRequest(
        "https://app.example.com/api/verify-booking-token?action=accept&token=valid-token&bookingUid=booking-uid&userId=999",
        "GET"
      );

      const res = await GET(req, { params: Promise.resolve({}) });

      expectErrorRedirect(res, "/booking/booking-uid", "Error confirming booking");
      expect(mockConfirmHandler).not.toHaveBeenCalled();
    });

    it("should call confirmHandler with reject action and reason for POST request", async () => {
      createMockBooking({
        id: 1,
        uid: "booking-uid",
        oneTimePassword: "valid-token",
      });
      createMockUser({
        id: 42,
        uuid: "user-uuid",
        email: "test@example.com",
        username: "testuser",
        role: "USER",
        destinationCalendar: null,
      });

      // Set the mock body for parseRequestData
      setMockRequestBody({ reason: "test" });

      const req = createMockRequest(
        "https://app.example.com/api/verify-booking-token?action=reject&token=valid-token&bookingUid=booking-uid&userId=42",
        "POST",
        { reason: "test" }
      );
      await POST(req, { params: Promise.resolve({}) });

      expect(mockConfirmHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            bookingId: 1,
            confirmed: false,
            reason: "test",
            emailsEnabled: true,
            actionSource: "MAGIC_LINK",
            actor: { type: "user", id: "test-uuid" },
          }),
        })
      );
    });
  });
});
