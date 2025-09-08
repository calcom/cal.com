import type { NextRequest } from "next/server";
import { Retell } from "retell-sdk";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { PrismaPhoneNumberRepository } from "@calcom/lib/server/repository/PrismaPhoneNumberRepository";
import type { CalAiPhoneNumber, User, Team } from "@calcom/prisma/client";

import { POST } from "../route";

type MockPhoneNumberWithUser = Omit<CalAiPhoneNumber, "user" | "team"> & {
  user: Pick<User, "id" | "email" | "name">;
  team: null;
};

type MockPhoneNumberWithTeam = Omit<CalAiPhoneNumber, "user" | "team"> & {
  user: null;
  team: Pick<Team, "id" | "name">;
};

type RetellWebhookBody = {
  event: "call_started" | "call_ended" | "call_analyzed";
  call: {
    call_id: string;
    agent_id?: string;
    from_number?: string;
    to_number?: string;
    direction?: "inbound" | "outbound";
    call_status?: string;
    start_timestamp?: number;
    end_timestamp?: number;
    disconnection_reason?: string;
    metadata?: Record<string, unknown>;
    retell_llm_dynamic_variables?: Record<string, unknown>;
    transcript?: string;
    opt_out_sensitive_data_storage?: boolean;
    call_cost?: {
      product_costs?: Array<{
        product: string;
        unitPrice?: number;
        cost?: number;
      }>;
      total_duration_seconds?: number;
      total_duration_unit_price?: number;
      total_one_time_price?: number;
      combined_cost?: number;
    };
    call_analysis?: {
      call_summary?: string;
      in_voicemail?: boolean;
      user_sentiment?: string;
      call_successful?: boolean;
      custom_analysis_data?: Record<string, unknown>;
    };
  };
};

vi.mock("app/api/defaultResponderForAppDir", () => ({
  defaultResponderForAppDir:
    (
      handler: (req: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<Response>
    ) =>
    async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) =>
      await handler(req, context || { params: Promise.resolve({}) }),
}));

vi.mock("retell-sdk", () => ({
  Retell: {
    verify: vi.fn(),
  },
}));

const mockHasAvailableCredits = vi.fn();
const mockChargeCredits = vi.fn();

vi.mock("@calcom/features/ee/billing/credit-service", () => ({
  CreditService: vi.fn().mockImplementation(() => ({
    hasAvailableCredits: mockHasAvailableCredits,
    chargeCredits: mockChargeCredits,
  })),
}));

vi.mock("@calcom/lib/server/repository/PrismaPhoneNumberRepository", () => ({
  PrismaPhoneNumberRepository: {
    findByPhoneNumber: vi.fn(),
  },
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
    })),
  },
}));

const createMockRequest = (body: RetellWebhookBody, signature?: string): NextRequest => {
  const request = {
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    headers: {
      get: vi.fn((name: string) => (name === "x-retell-signature" ? signature : null)),
    },
  } as unknown as NextRequest;
  return request;
};

const callPOST = (request: NextRequest) => POST(request, { params: Promise.resolve({}) });

describe("Retell AI Webhook Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RETELL_AI_KEY", "test-api-key");
    vi.stubEnv("CAL_AI_CALL_RATE_PER_MINUTE", "0.29");
  });

  it("should return 401 when signature is missing", async () => {
    const request = createMockRequest(
      { event: "call_analyzed", call: { call_id: "test-call-id" } },
      "some-signature"
    );
    const response = await callPOST(request);

    expect(response.status).toBe(401);
  });

  it("should return 401 when API key is not configured", async () => {
    vi.unstubAllEnvs();

    const request = createMockRequest(
      { event: "call_analyzed", call: { call_id: "test-call-id" } },
      "some-signature"
    );
    const response = await callPOST(request);

    expect(response.status).toBe(401);

    // Restore the stubbed env for subsequent tests
    vi.stubEnv("RETELL_AI_KEY", "test-api-key");
  });

  it("should return 401 when signature is invalid", async () => {
    vi.mocked(Retell.verify).mockReturnValue(false);

    const request = createMockRequest(
      { event: "call_analyzed", call: { call_id: "test-call-id" } },
      "invalid-signature"
    );
    const response = await callPOST(request);

    expect(response.status).toBe(401);
  });

  it("should handle non-call_analyzed events", async () => {
    vi.mocked(Retell.verify).mockReturnValue(true);

    const body: RetellWebhookBody = {
      event: "call_started",
      call: { call_id: "test-call-id" },
    };

    const request = createMockRequest(body, "valid-signature");
    const response = await callPOST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("No handling for call_started");
  });

  it("should process call_analyzed event with valid phone number and sufficient credits", async () => {
    vi.mocked(Retell.verify).mockReturnValue(true);

    const mockPhoneNumber: MockPhoneNumberWithUser = {
      id: 1,
      phoneNumber: "+1234567890",
      userId: 1,
      teamId: null,
      provider: "test-provider",
      providerPhoneNumberId: "test-provider-id",
      createdAt: new Date(),
      updatedAt: new Date(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      inboundAgentId: null,
      outboundAgentId: null,
      user: { id: 1, email: "test@example.com", name: "Test User" },
      team: null,
    };

    vi.mocked(PrismaPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(mockPhoneNumber);

    mockHasAvailableCredits.mockResolvedValue(true);
    mockChargeCredits.mockResolvedValue(undefined);

    const body: RetellWebhookBody = {
      event: "call_analyzed",
      call: {
        call_id: "test-call-id",
        from_number: "+1234567890",
        to_number: "+0987654321",
        direction: "outbound",
        call_status: "completed",
        start_timestamp: 1234567890,
        call_cost: {
          combined_cost: 100,
          total_duration_seconds: 120,
        },
      },
    };

    const request = createMockRequest(body, "valid-signature");
    const response = await callPOST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockChargeCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        teamId: undefined,
        credits: 58, // 120 seconds = 2 minutes * $0.29 = $0.58 = 58 credits
        callDuration: 120,
        externalRef: "retell:test-call-id",
      })
    );
  });

  it("should handle team phone numbers", async () => {
    vi.mocked(Retell.verify).mockReturnValue(true);

    const mockTeamPhoneNumber: MockPhoneNumberWithTeam = {
      id: 2,
      phoneNumber: "+1234567890",
      userId: null,
      teamId: 5,
      provider: "test-provider",
      providerPhoneNumberId: "test-provider-id-2",
      createdAt: new Date(),
      updatedAt: new Date(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      inboundAgentId: null,
      outboundAgentId: null,
      team: { id: 5, name: "Test Team" },
      user: null,
    };

    vi.mocked(PrismaPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(mockTeamPhoneNumber);

    mockHasAvailableCredits.mockResolvedValue(true);
    mockChargeCredits.mockResolvedValue(undefined);

    const body: RetellWebhookBody = {
      event: "call_analyzed",
      call: {
        call_id: "test-call-id",
        from_number: "+1234567890",
        to_number: "+0987654321",
        direction: "outbound",
        call_status: "completed",
        start_timestamp: 1234567890,
        call_cost: {
          combined_cost: 50,
          total_duration_seconds: 180,
        },
      },
    };

    const request = createMockRequest(body, "valid-signature");
    const response = await callPOST(request);

    expect(response.status).toBe(200);
    expect(mockChargeCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: undefined,
        teamId: 5,
        credits: 87, // 180 seconds = 3 minutes * $0.29 = $0.87 = 87 credits
        callDuration: 180,
        externalRef: "retell:test-call-id",
      })
    );
  });

  it("should handle missing total_duration_seconds", async () => {
    vi.mocked(Retell.verify).mockReturnValue(true);

    const body: RetellWebhookBody = {
      event: "call_analyzed",
      call: {
        call_id: "test-call-id",
        from_number: "+1234567890",
        to_number: "+0987654321",
        direction: "outbound",
        call_status: "completed",
        start_timestamp: 1234567890,
        call_cost: {
          combined_cost: 100,
          // missing total_duration_seconds
        },
      },
    };

    const request = createMockRequest(body, "valid-signature");
    const response = await callPOST(request);

    expect(response.status).toBe(200);
    expect(PrismaPhoneNumberRepository.findByPhoneNumber).not.toHaveBeenCalled();
  });

  it("should handle phone number not found", async () => {
    vi.mocked(Retell.verify).mockReturnValue(true);
    vi.mocked(PrismaPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(null);

    const body: RetellWebhookBody = {
      event: "call_analyzed",
      call: {
        call_id: "test-call-id",
        from_number: "+1234567890",
        to_number: "+0987654321",
        direction: "outbound",
        call_status: "completed",
        start_timestamp: 1234567890,
        call_cost: {
          combined_cost: 100,
          total_duration_seconds: 90,
        },
      },
    };

    const request = createMockRequest(body, "valid-signature");
    const response = await callPOST(request);

    expect(response.status).toBe(200);
    expect(mockChargeCredits).not.toHaveBeenCalled();
  });

  it("should handle insufficient credits", async () => {
    vi.mocked(Retell.verify).mockReturnValue(true);

    const mockPhoneNumber: MockPhoneNumberWithUser = {
      id: 3,
      phoneNumber: "+1234567890",
      userId: 1,
      teamId: null,
      provider: "test-provider",
      providerPhoneNumberId: "test-provider-id-3",
      createdAt: new Date(),
      updatedAt: new Date(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      inboundAgentId: null,
      outboundAgentId: null,
      user: { id: 1, email: "test@example.com", name: "Test User" },
      team: null,
    };

    vi.mocked(PrismaPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(mockPhoneNumber);

    mockHasAvailableCredits.mockResolvedValue(false);

    const body: RetellWebhookBody = {
      event: "call_analyzed",
      call: {
        call_id: "test-call-id",
        from_number: "+1234567890",
        to_number: "+0987654321",
        direction: "outbound",
        call_status: "completed",
        start_timestamp: 1234567890,
        call_cost: {
          combined_cost: 100,
          total_duration_seconds: 150,
        },
      },
    };

    const request = createMockRequest(body, "valid-signature");
    const response = await callPOST(request);

    expect(response.status).toBe(200);
  });

  it("should handle schema validation errors", async () => {
    vi.mocked(Retell.verify).mockReturnValue(true);

    const body: RetellWebhookBody = {
      event: "call_analyzed",
      call: {
        // Missing required fields like from_number, to_number, etc.
        call_id: "test-call-id",
      },
    };

    const request = createMockRequest(body, "valid-signature");
    const response = await callPOST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.error).toBe("Internal server error");
  });

  it("should calculate credits correctly based on duration", async () => {
    const testCases = [
      { durationSeconds: 60, expectedCredits: 29 }, // 1 minute * $0.29 = $0.29 = 29 credits
      { durationSeconds: 120, expectedCredits: 58 }, // 2 minutes * $0.29 = $0.58 = 58 credits
      { durationSeconds: 150, expectedCredits: 73 }, // 2.5 minutes * $0.29 = $0.725 = 73 credits (rounded up)
      { durationSeconds: 30, expectedCredits: 15 }, // 0.5 minutes * $0.29 = $0.145 = 15 credits (rounded up)
    ];

    for (const { durationSeconds, expectedCredits } of testCases) {
      vi.clearAllMocks();
      vi.mocked(Retell.verify).mockReturnValue(true);

      const mockPhoneNumber: MockPhoneNumberWithUser = {
        id: 4,
        phoneNumber: "+1234567890",
        userId: 1,
        teamId: null,
        provider: "test-provider",
        providerPhoneNumberId: "test-provider-id-4",
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: null,
        inboundAgentId: null,
        outboundAgentId: null,
        user: { id: 1, email: "test@example.com", name: "Test User" },
        team: null,
      };

      vi.mocked(PrismaPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(mockPhoneNumber);
      mockHasAvailableCredits.mockResolvedValue(true);
      mockChargeCredits.mockResolvedValue(undefined);

      const body: RetellWebhookBody = {
        event: "call_analyzed",
        call: {
          call_id: `test-call-${durationSeconds}s`,
          from_number: "+1234567890",
          to_number: "+0987654321",
          direction: "outbound",
          call_status: "completed",
          start_timestamp: 1234567890,
          call_cost: {
            combined_cost: 100, // This is ignored now
            total_duration_seconds: durationSeconds,
          },
        },
      };

      const request = createMockRequest(body, "valid-signature");
      await callPOST(request);

      expect(mockChargeCredits).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          teamId: undefined,
          credits: expectedCredits,
          callDuration: durationSeconds,
          externalRef: expect.stringMatching(/^retell:test-call-/),
        })
      );
    }
  });

  it("should pass callDuration to chargeCredits when provided", async () => {
    vi.mocked(Retell.verify).mockReturnValue(true);
    const mockPhoneNumber: MockPhoneNumberWithUser = {
      id: 10,
      phoneNumber: "+15550001111",
      userId: 42,
      teamId: null,
      provider: "test-provider",
      providerPhoneNumberId: "prov-10",
      createdAt: new Date(),
      updatedAt: new Date(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      inboundAgentId: null,
      outboundAgentId: null,
      user: { id: 42, email: "u@example.com", name: "U" },
      team: null,
    };
    vi.mocked(PrismaPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(mockPhoneNumber);
    mockHasAvailableCredits.mockResolvedValue(true);
    mockChargeCredits.mockResolvedValue(undefined);

    const body: RetellWebhookBody = {
      event: "call_analyzed",
      call: {
        call_id: "call-dur",
        from_number: "+15550002222",
        to_number: "+15550001111",
        direction: "outbound",
        call_status: "completed",
        start_timestamp: 123,
        call_cost: {
          combined_cost: 12, // This is ignored now
          total_duration_seconds: 125,
        },
      },
    };
    const response = await callPOST(createMockRequest(body, "valid-signature"));
    expect(response.status).toBe(200);
    expect(mockChargeCredits).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, credits: 61, callDuration: 125 }) // 125s = 2.083 minutes * $0.29 = $0.604 = 61 credits (rounded up)
    );
  });

  describe("Idempotency", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should pass externalRef with correct format to chargeCredits", async () => {
      vi.mocked(Retell.verify).mockReturnValue(true);
      const mockPhoneNumber: MockPhoneNumberWithUser = {
        id: 1,
        phoneNumber: "+1234567890",
        userId: 1,
        teamId: null,
        provider: "test-provider",
        providerPhoneNumberId: "test-provider-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: null,
        inboundAgentId: null,
        outboundAgentId: null,
        user: { id: 1, email: "test@example.com", name: "Test User" },
        team: null,
      };
      vi.mocked(PrismaPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(mockPhoneNumber);
      mockChargeCredits.mockResolvedValue({ userId: 1 });

      const body: RetellWebhookBody = {
        event: "call_analyzed",
        call: {
          call_id: "test-idempotency-call",
          from_number: "+1234567890",
          to_number: "+0987654321",
          direction: "outbound",
          call_status: "completed",
          start_timestamp: 1234567890,
          call_cost: {
            combined_cost: 100,
            total_duration_seconds: 60,
          },
        },
      };

      const response = await callPOST(createMockRequest(body, "valid-signature"));

      expect(response.status).toBe(200);
      expect(mockChargeCredits).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          teamId: undefined,
          credits: 29, // 60 seconds = 1 minute * $0.29 = $0.29 = 29 credits
          callDuration: 60,
          externalRef: "retell:test-idempotency-call",
        })
      );
    });

    it("should handle duplicate webhook calls idempotently", async () => {
      vi.mocked(Retell.verify).mockReturnValue(true);
      const mockPhoneNumber: MockPhoneNumberWithUser = {
        id: 1,
        phoneNumber: "+1234567890",
        userId: 1,
        teamId: null,
        provider: "test-provider",
        providerPhoneNumberId: "test-provider-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: null,
        inboundAgentId: null,
        outboundAgentId: null,
        user: { id: 1, email: "test@example.com", name: "Test User" },
        team: null,
      };
      vi.mocked(PrismaPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(mockPhoneNumber);

      const body: RetellWebhookBody = {
        event: "call_analyzed",
        call: {
          call_id: "duplicate-call-id",
          from_number: "+1234567890",
          to_number: "+0987654321",
          direction: "outbound",
          call_status: "completed",
          start_timestamp: 1234567890,
          call_cost: {
            combined_cost: 100,
            total_duration_seconds: 60,
          },
        },
      };

      // First call - should charge normally
      mockChargeCredits.mockResolvedValue({ userId: 1 });
      const response1 = await callPOST(createMockRequest(body, "valid-signature"));
      expect(response1.status).toBe(200);
      const data1 = await response1.json();
      expect(data1.success).toBe(true);
      expect(data1.message).toContain("Successfully charged 29 credits");

      // Second call - should return duplicate
      mockChargeCredits.mockResolvedValue({ bookingUid: null, duplicate: true });
      const response2 = await callPOST(createMockRequest(body, "valid-signature"));
      expect(response2.status).toBe(200);
      const data2 = await response2.json();
      expect(data2.success).toBe(true);
      expect(data2.message).toContain("Successfully charged 29 credits");

      // Verify chargeCredits was called twice with same externalRef
      expect(mockChargeCredits).toHaveBeenCalledTimes(2);
      expect(mockChargeCredits).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ externalRef: "retell:duplicate-call-id" })
      );
      expect(mockChargeCredits).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ externalRef: "retell:duplicate-call-id" })
      );
    });

    it("should handle errors from chargeCredits gracefully", async () => {
      vi.mocked(Retell.verify).mockReturnValue(true);
      const mockPhoneNumber: MockPhoneNumberWithUser = {
        id: 1,
        phoneNumber: "+1234567890",
        userId: 1,
        teamId: null,
        provider: "test-provider",
        providerPhoneNumberId: "test-provider-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: null,
        inboundAgentId: null,
        outboundAgentId: null,
        user: { id: 1, email: "test@example.com", name: "Test User" },
        team: null,
      };
      vi.mocked(PrismaPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(mockPhoneNumber);

      // Mock chargeCredits to throw an error
      mockChargeCredits.mockRejectedValue(new Error("Credit service error"));

      const body: RetellWebhookBody = {
        event: "call_analyzed",
        call: {
          call_id: "error-call-id",
          from_number: "+1234567890",
          to_number: "+0987654321",
          direction: "outbound",
          call_status: "completed",
          start_timestamp: 1234567890,
          call_cost: {
            combined_cost: 100,
            total_duration_seconds: 60,
          },
        },
      };

      const response = await callPOST(createMockRequest(body, "valid-signature"));

      // Should still return 200 to prevent retries
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain("Error charging credits for Retell AI call");
    });
  });
});
