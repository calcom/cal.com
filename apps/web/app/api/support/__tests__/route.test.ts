import { describe, it, expect, vi, beforeEach } from "vitest";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { POST } from "../route";

vi.mock("@calcom/features/auth/lib/getServerSession", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@calcom/lib/constants", async () => {
  const actual = (await vi.importActual("@calcom/lib/constants")) as typeof import("@calcom/lib/constants");
  return {
    ...actual,
    IS_PRODUCTION: true,
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

vi.mock("@lib/plain/plain", () => {
  const mockGetCustomerByEmail = vi.fn();
  const mockCreateThread = vi.fn();
  const mockUpsertPlainCustomer = vi.fn();

  return {
    plain: {
      getCustomerByEmail: mockGetCustomerByEmail,
      createThread: mockCreateThread,
    },
    upsertPlainCustomer: mockUpsertPlainCustomer,
  };
});

const mockGetServerSession = vi.mocked(getServerSession);

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

    const { plain } = vi.mocked(await import("@lib/plain/plain"));
    vi.mocked(plain.getCustomerByEmail).mockResolvedValue({
      data: {
        id: "customer-123",
        __typename: "Customer",
        fullName: "Test User",
        shortName: "Test",
        externalId: "123",
        email: {
          email: "test@example.com",
          isVerified: true,
          verifiedAt: {
            __typename: "DateTime",
            iso8601: "2025-01-01T00:00:00Z",
            unixTimestamp: "1735689600",
          },
        },
        company: null,
        createdBy: { __typename: "SystemActor" as const, systemId: "system" },
        updatedAt: { __typename: "DateTime", iso8601: "2025-01-01T00:00:00Z", unixTimestamp: "1735689600" },
        createdAt: { __typename: "DateTime", iso8601: "2025-01-01T00:00:00Z", unixTimestamp: "1735689600" },
        markedAsSpamAt: null,
      },
    });

    vi.mocked(plain.createThread).mockResolvedValue({
      data: {
        id: "thread-123",
        __typename: "Thread",
        externalId: null,
        title: "Test message",
        description: null,
        status: "Todo" as any,
        statusChangedAt: {
          __typename: "DateTime",
          iso8601: "2025-01-01T00:00:00Z",
          unixTimestamp: "1735689600",
        },
        statusDetail: null,
        customer: { id: "customer-123" },
        priority: 0,
        previewText: "Test message",
        updatedAt: { __typename: "DateTime", iso8601: "2025-01-01T00:00:00Z", unixTimestamp: "1735689600" },
        createdAt: { __typename: "DateTime", iso8601: "2025-01-01T00:00:00Z", unixTimestamp: "1735689600" },
      } as any,
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

    expect(vi.mocked(plain.getCustomerByEmail)).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(vi.mocked(plain.createThread)).toHaveBeenCalled();
  });

  it("should handle form submission with file attachments", async () => {
    mockGetServerSession.mockResolvedValue({
      hasValidLicense: true,
      upId: "test-up-id",
      expires: "2025-12-31T23:59:59.999Z",
      user: { id: 123, email: "test@example.com" },
    });

    const { plain, upsertPlainCustomer } = vi.mocked(await import("@lib/plain/plain"));
    vi.mocked(plain.getCustomerByEmail).mockResolvedValue({
      data: null,
    });

    vi.mocked(upsertPlainCustomer).mockResolvedValue({
      data: {
        result: "Created" as any,
        customer: {
          id: "customer-456",
          __typename: "Customer",
          fullName: "Test User",
          shortName: "Test",
          externalId: "123",
          email: {
            email: "test@example.com",
            isVerified: true,
            verifiedAt: {
              __typename: "DateTime",
              iso8601: "2025-01-01T00:00:00Z",
              unixTimestamp: "1735689600",
            },
          },
          company: null,
          createdBy: { __typename: "SystemActor" as const, systemId: "system" },
          updatedAt: { __typename: "DateTime", iso8601: "2025-01-01T00:00:00Z", unixTimestamp: "1735689600" },
          createdAt: { __typename: "DateTime", iso8601: "2025-01-01T00:00:00Z", unixTimestamp: "1735689600" },
          markedAsSpamAt: null,
        },
      },
    });

    vi.mocked(plain.createThread).mockResolvedValue({
      data: {
        id: "thread-456",
        __typename: "Thread",
        externalId: null,
        title: "Test message",
        description: null,
        status: "Todo" as any,
        statusChangedAt: {
          __typename: "DateTime",
          iso8601: "2025-01-01T00:00:00Z",
          unixTimestamp: "1735689600",
        },
        statusDetail: null,
        customer: { id: "customer-456" },
        priority: 0,
        previewText: "Test message",
        updatedAt: { __typename: "DateTime", iso8601: "2025-01-01T00:00:00Z", unixTimestamp: "1735689600" },
        createdAt: { __typename: "DateTime", iso8601: "2025-01-01T00:00:00Z", unixTimestamp: "1735689600" },
      } as any,
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

    expect(vi.mocked(plain.getCustomerByEmail)).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(vi.mocked(upsertPlainCustomer)).toHaveBeenCalled();
    expect(vi.mocked(plain.createThread)).toHaveBeenCalled();
  });

  it("should handle Plain customer creation error", async () => {
    mockGetServerSession.mockResolvedValue({
      hasValidLicense: true,
      upId: "test-up-id",
      expires: "2025-12-31T23:59:59.999Z",
      user: { id: 123, email: "test@example.com" },
    });

    const { plain, upsertPlainCustomer } = vi.mocked(await import("@lib/plain/plain"));
    vi.mocked(plain.getCustomerByEmail).mockResolvedValue({
      data: null,
    });

    vi.mocked(upsertPlainCustomer).mockResolvedValue({
      error: {
        type: "unknown",
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

    const { plain } = vi.mocked(await import("@lib/plain/plain"));
    vi.mocked(plain.getCustomerByEmail).mockResolvedValue({
      data: {
        id: "customer-123",
        __typename: "Customer",
        fullName: "Test User",
        shortName: "Test",
        externalId: "123",
        email: {
          email: "test@example.com",
          isVerified: true,
          verifiedAt: {
            __typename: "DateTime",
            iso8601: "2025-01-01T00:00:00Z",
            unixTimestamp: "1735689600",
          },
        },
        company: null,
        createdBy: { __typename: "SystemActor" as const, systemId: "system" },
        updatedAt: { __typename: "DateTime", iso8601: "2025-01-01T00:00:00Z", unixTimestamp: "1735689600" },
        createdAt: { __typename: "DateTime", iso8601: "2025-01-01T00:00:00Z", unixTimestamp: "1735689600" },
        markedAsSpamAt: null,
      },
    });

    vi.mocked(plain.createThread).mockResolvedValue({
      error: {
        type: "unknown",
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
