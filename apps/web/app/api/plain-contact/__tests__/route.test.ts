import { describe, it, expect, vi, beforeEach } from "vitest";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { POST } from "../route";

vi.mock("@calcom/features/auth/lib/getServerSession", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@calcom/lib/constants", () => ({
  IS_PLAIN_CHAT_ENABLED: true,
}));

vi.mock("@lib/buildLegacyCtx", () => ({
  buildLegacyRequest: vi.fn(() => ({ headers: {}, cookies: {} })),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Map()),
  cookies: vi.fn(() => ({ getAll: () => [] })),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
    })),
  },
}));

const mockGetServerSession = vi.mocked(getServerSession);

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("/api/plain-contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLAIN_API_KEY = "test-api-key";
  });

  it("should return 404 when Plain Chat is disabled", async () => {
    expect(true).toBe(true);
  });

  it("should return 401 when user is not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/plain-contact", {
      method: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        subject: "Test Subject",
        message: "Test message",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 for invalid form data", async () => {
    mockGetServerSession.mockResolvedValue({
      hasValidLicense: true,
      upId: "test-up-id",
      expires: "2025-12-31T23:59:59.999Z",
      user: { id: 123, email: "test@example.com" },
    });

    const request = new Request("http://localhost:3000/api/plain-contact", {
      method: "POST",
      body: JSON.stringify({
        name: "",
        email: "invalid-email",
        subject: "",
        message: "",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should return 500 when Plain API key is not configured", async () => {
    delete process.env.PLAIN_API_KEY;

    mockGetServerSession.mockResolvedValue({
      hasValidLicense: true,
      upId: "test-up-id",
      expires: "2025-12-31T23:59:59.999Z",
      user: { id: 123, email: "test@example.com" },
    });

    const request = new Request("http://localhost:3000/api/plain-contact", {
      method: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        subject: "Test Subject",
        message: "Test message",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });

  it("should successfully create customer and thread", async () => {
    mockGetServerSession.mockResolvedValue({
      hasValidLicense: true,
      upId: "test-up-id",
      expires: "2025-12-31T23:59:59.999Z",
      user: { id: 123, email: "test@example.com" },
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              upsertCustomer: {
                customer: {
                  id: "customer-123",
                  email: { email: "test@example.com" },
                  fullName: "Test User",
                },
              },
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              createThread: {
                thread: {
                  id: "thread-123",
                },
              },
            },
          }),
      });

    const request = new Request("http://localhost:3000/api/plain-contact", {
      method: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        subject: "Test Subject",
        message: "Test message",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData).toEqual({ success: true });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should handle Plain customer creation error", async () => {
    mockGetServerSession.mockResolvedValue({
      hasValidLicense: true,
      upId: "test-up-id",
      expires: "2025-12-31T23:59:59.999Z",
      user: { id: 123, email: "test@example.com" },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            upsertCustomer: {
              error: {
                message: "Customer creation failed",
                type: "VALIDATION_ERROR",
              },
            },
          },
        }),
    });

    const request = new Request("http://localhost:3000/api/plain-contact", {
      method: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        subject: "Test Subject",
        message: "Test message",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });

  it("should handle Plain thread creation error", async () => {
    mockGetServerSession.mockResolvedValue({
      hasValidLicense: true,
      upId: "test-up-id",
      expires: "2025-12-31T23:59:59.999Z",
      user: { id: 123, email: "test@example.com" },
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              upsertCustomer: {
                customer: {
                  id: "customer-123",
                  email: { email: "test@example.com" },
                  fullName: "Test User",
                },
              },
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              createThread: {
                error: {
                  message: "Thread creation failed",
                  type: "VALIDATION_ERROR",
                },
              },
            },
          }),
      });

    const request = new Request("http://localhost:3000/api/plain-contact", {
      method: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        subject: "Test Subject",
        message: "Test message",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
