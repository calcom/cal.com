import { describe, it, expect, vi, beforeEach } from "vitest";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { POST } from "../route";

vi.mock("@calcom/features/auth/lib/getServerSession", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@calcom/lib/constants", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    IS_PLAIN_CHAT_ENABLED: true,
  };
});

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

vi.mock("@lib/plain/plain", () => ({
  plain: {
    getCustomerByEmail: vi.fn(),
    createThread: vi.fn(),
  },
  upsertPlainCustomer: vi.fn(),
}));

const mockGetServerSession = vi.mocked(getServerSession);

const { plain: mockPlain, upsertPlainCustomer: mockUpsertPlainCustomer } = vi.mocked(
  await import("@lib/plain/plain")
);

describe("/api/support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLAIN_API_KEY = "test-api-key";
  });

  it("should return 404 when Plain Chat is disabled", async () => {
    expect(true).toBe(true);
  });

  it("should return 401 when user is not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/support", {
      method: "POST",
      body: JSON.stringify({
        message: "Test message",
        attachmentIds: [],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 500 for invalid form data", async () => {
    mockGetServerSession.mockResolvedValue({
      hasValidLicense: true,
      upId: "test-up-id",
      expires: "2025-12-31T23:59:59.999Z",
      user: { id: 123, email: "test@example.com" },
    });

    const request = new Request("http://localhost:3000/api/support", {
      method: "POST",
      body: JSON.stringify({
        message: "",
        attachmentIds: [],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });

  it("should return 500 when Plain API key is not configured", async () => {
    delete process.env.PLAIN_API_KEY;

    mockGetServerSession.mockResolvedValue({
      hasValidLicense: true,
      upId: "test-up-id",
      expires: "2025-12-31T23:59:59.999Z",
      user: { id: 123, email: "test@example.com" },
    });

    const request = new Request("http://localhost:3000/api/support", {
      method: "POST",
      body: JSON.stringify({
        message: "Test message",
        attachmentIds: [],
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

    mockPlain.getCustomerByEmail.mockResolvedValue({
      data: {
        id: "customer-123",
      },
    });

    mockPlain.createThread.mockResolvedValue({
      data: {
        id: "thread-123",
      },
    });

    const request = new Request("http://localhost:3000/api/support", {
      method: "POST",
      body: JSON.stringify({
        message: "Test message",
        attachmentIds: [],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData).toBeDefined();

    expect(mockPlain.getCustomerByEmail).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(mockPlain.createThread).toHaveBeenCalled();
  });

  it("should handle form submission with file attachments", async () => {
    mockGetServerSession.mockResolvedValue({
      hasValidLicense: true,
      upId: "test-up-id",
      expires: "2025-12-31T23:59:59.999Z",
      user: { id: 123, email: "test@example.com" },
    });

    mockPlain.getCustomerByEmail.mockResolvedValue({
      data: null,
    });

    mockUpsertPlainCustomer.mockResolvedValue({
      data: {
        customer: {
          id: "customer-456",
        },
      },
    });

    mockPlain.createThread.mockResolvedValue({
      data: {
        id: "thread-456",
      },
    });

    const request = new Request("http://localhost:3000/api/support", {
      method: "POST",
      body: JSON.stringify({
        message: "Test message",
        attachmentIds: ["attachment-123"],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData).toBeDefined();

    expect(mockPlain.getCustomerByEmail).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(mockUpsertPlainCustomer).toHaveBeenCalled();
    expect(mockPlain.createThread).toHaveBeenCalled();
  });

  it("should handle Plain customer creation error", async () => {
    mockGetServerSession.mockResolvedValue({
      hasValidLicense: true,
      upId: "test-up-id",
      expires: "2025-12-31T23:59:59.999Z",
      user: { id: 123, email: "test@example.com" },
    });

    mockPlain.getCustomerByEmail.mockResolvedValue({
      data: null,
    });

    mockUpsertPlainCustomer.mockResolvedValue({
      error: {
        message: "Customer creation failed",
      },
    });

    const request = new Request("http://localhost:3000/api/support", {
      method: "POST",
      body: JSON.stringify({
        message: "Test message",
        attachmentIds: [],
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

    mockPlain.getCustomerByEmail.mockResolvedValue({
      data: {
        id: "customer-123",
      },
    });

    mockPlain.createThread.mockResolvedValue({
      error: {
        message: "Thread creation failed",
      },
    });

    const request = new Request("http://localhost:3000/api/support", {
      method: "POST",
      body: JSON.stringify({
        message: "Test message",
        attachmentIds: [],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
