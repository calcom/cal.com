import type { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: vi.fn().mockReturnValue(
    JSON.stringify({
      bookingUid: "test-booking-uid",
      userId: 1,
    })
  ),
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    booking: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: 1,
        uid: "test-booking-uid",
        recurringEventId: null,
      }),
    },
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: 1,
        locale: "en",
      }),
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
import { GET } from "../route";

const createMockRequest = (url: string): NextRequest => {
  const urlObj = new URL(url);
  return {
    method: "GET",
    url,
    nextUrl: {
      searchParams: urlObj.searchParams,
    },
  } as unknown as NextRequest;
};

describe("link route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET handler - redirect URL construction", () => {
    it("should redirect to booking page with the same origin as the request", async () => {
      const baseUrl = "https://app.example.com/api/link?action=accept&token=encrypted-token";
      const req = createMockRequest(baseUrl);

      const res = await GET(req, { params: Promise.resolve({}) });
      const location = res.headers.get("location");

      expect(location).toBeTruthy();
      const redirectUrl = new URL(location!);

      expect(redirectUrl.origin).toBe("https://app.example.com");
      expect(redirectUrl.pathname).toBe("/booking/test-booking-uid");
    });

    it("should preserve custom domain origin in redirect URL", async () => {
      const baseUrl = "https://custom-domain.company.com/api/link?action=accept&token=encrypted-token";
      const req = createMockRequest(baseUrl);

      const res = await GET(req, { params: Promise.resolve({}) });
      const location = res.headers.get("location");

      expect(location).toBeTruthy();
      const redirectUrl = new URL(location!);

      expect(redirectUrl.origin).toBe("https://custom-domain.company.com");
      expect(location).not.toContain("localhost");
    });

    it("should preserve self-hosted domain origin in redirect URL", async () => {
      const baseUrl = "https://calcom.internal.company.net/api/link?action=reject&token=encrypted-token";
      const req = createMockRequest(baseUrl);

      const res = await GET(req, { params: Promise.resolve({}) });
      const location = res.headers.get("location");

      expect(location).toBeTruthy();
      const redirectUrl = new URL(location!);

      expect(redirectUrl.origin).toBe("https://calcom.internal.company.net");
      expect(location).not.toContain("localhost");
    });

    it("should construct redirect URLs relative to the request URL for various origins", async () => {
      const testOrigins = [
        "https://app.cal.com",
        "https://acme.cal.com",
        "https://calcom.company.internal",
        "http://192.168.1.100:3000",
      ];

      for (const origin of testOrigins) {
        vi.clearAllMocks();
        const baseUrl = `${origin}/api/link?action=accept&token=encrypted-token`;
        const req = createMockRequest(baseUrl);

        const res = await GET(req, { params: Promise.resolve({}) });
        const location = res.headers.get("location");

        expect(location).toBeTruthy();
        const redirectUrl = new URL(location!);

        expect(redirectUrl.origin).toBe(origin);
        expect(redirectUrl.pathname).toBe("/booking/test-booking-uid");
      }
    });
  });

  describe("GET handler - error handling", () => {
    it("should redirect with error message when TRPC throws an error", async () => {
      const { TRPCError } = await import("@trpc/server");

      // Mock createCallerFactory to throw a TRPCError
      const { createCallerFactory } = await import("@calcom/trpc/server/trpc");
      vi.mocked(createCallerFactory).mockReturnValue(() => ({
        confirm: vi.fn().mockRejectedValue(new TRPCError({ code: "BAD_REQUEST", message: "Custom error" })),
      }));

      const baseUrl = "https://app.example.com/api/link?action=accept&token=encrypted-token";
      const req = createMockRequest(baseUrl);

      const res = await GET(req, { params: Promise.resolve({}) });
      const location = res.headers.get("location");

      expect(location).toBeTruthy();
      const redirectUrl = new URL(location!);

      expect(redirectUrl.origin).toBe("https://app.example.com");
      expect(redirectUrl.pathname).toBe("/booking/test-booking-uid");
      expect(redirectUrl.searchParams.get("error")).toBe("Custom error");
    });

    it("should preserve origin in error redirect URL", async () => {
      const { TRPCError } = await import("@trpc/server");

      // Mock createCallerFactory to throw a TRPCError
      const { createCallerFactory } = await import("@calcom/trpc/server/trpc");
      vi.mocked(createCallerFactory).mockReturnValue(() => ({
        confirm: vi.fn().mockRejectedValue(new TRPCError({ code: "INTERNAL_SERVER_ERROR" })),
      }));

      const baseUrl = "https://self-hosted.company.org/api/link?action=accept&token=encrypted-token";
      const req = createMockRequest(baseUrl);

      const res = await GET(req, { params: Promise.resolve({}) });
      const location = res.headers.get("location");

      expect(location).toBeTruthy();
      const redirectUrl = new URL(location!);

      expect(redirectUrl.origin).toBe("https://self-hosted.company.org");
      expect(location).not.toContain("localhost");
    });
  });
});
