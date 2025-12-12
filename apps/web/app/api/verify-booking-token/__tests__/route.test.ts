import type { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("app/api/defaultResponderForAppDir", () => ({
  defaultResponderForAppDir:
    (handler: (req: NextRequest) => Promise<Response>) =>
    (req: NextRequest, _context: { params: Promise<Record<string, string>> }) =>
      handler(req),
}));

vi.mock("app/api/parseRequestData", () => ({
  parseRequestData: vi.fn().mockResolvedValue({}),
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
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUniqueOrThrow: vi.fn(),
    },
  },
}));

vi.mock("@calcom/trpc/server/createContext", () => ({
  createContext: vi.fn().mockResolvedValue({}),
}));

vi.mock("@calcom/trpc/server/routers/viewer/bookings/_router", () => ({
  bookingsRouter: {},
}));

vi.mock("@calcom/trpc/server/trpc", () => ({
  createCallerFactory: vi.fn().mockReturnValue(() => ({
    confirm: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock("@lib/buildLegacyCtx", () => ({
  buildLegacyRequest: vi.fn().mockReturnValue({}),
}));

// Import after mocks are set up
import { GET, POST } from "../route";

const createMockRequest = (url: string, method: "GET" | "POST" = "GET"): NextRequest => {
  const urlObj = new URL(url);
  return {
    method,
    url,
    nextUrl: {
      searchParams: urlObj.searchParams,
    },
  } as unknown as NextRequest;
};

describe("verify-booking-token route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        "https://app.example.com/api/verify-booking-token?token=test-token&bookingUid=abc123&userId=42";
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
        "https://self-hosted.company.com/api/verify-booking-token?bookingUid=uid123&token=t&userId=1";
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
});
