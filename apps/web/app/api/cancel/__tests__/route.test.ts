import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@calcom/features/auth/lib/getServerSession", () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("@calcom/features/bookings/lib/handleCancelBooking", () => ({
  default: vi.fn().mockResolvedValue({ success: true, bookingUid: "test-uid" }),
}));

vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
  checkRateLimitAndThrowError: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/lib/getIP", () => ({
  default: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@calcom/lib/server/PiiHasher", () => ({
  piiHasher: { hash: vi.fn().mockReturnValue("hashed-ip") },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "a".repeat(64) }),
    delete: vi.fn(),
  }),
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@lib/buildLegacyCtx", () => ({
  buildLegacyRequest: vi.fn().mockReturnValue({}),
}));

vi.mock("@calcom/web/lib/validateCsrfToken", () => ({
  validateCsrfToken: vi.fn().mockResolvedValue(null),
}));

vi.mock("app/api/defaultResponderForAppDir", () => ({
  defaultResponderForAppDir: (handler: (req: NextRequest) => Promise<Response>) =>
    (req: NextRequest, _ctx: { params: Promise<Record<string, string>> }) => handler(req),
}));

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/cancel", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const emptyParams = { params: Promise.resolve({}) };
const validCsrfToken = "a".repeat(64);

describe("POST /api/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects cancellation by integer id without uid", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ id: 1, csrfToken: validCsrfToken }), emptyParams);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toContain("uid is required");
  });

  it("allows cancellation by uid", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({ uid: "b55d014e-d811-4f7b-a44e-c136f2bf85de", csrfToken: validCsrfToken }),
      emptyParams
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("strips integer id when both id and uid are provided", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;
    const { POST } = await import("../route");

    await POST(
      makeRequest({ id: 1, uid: "b55d014e-d811-4f7b-a44e-c136f2bf85de", csrfToken: validCsrfToken }),
      emptyParams
    );

    expect(handleCancelBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.not.objectContaining({ id: 1 }),
      })
    );
  });
});
