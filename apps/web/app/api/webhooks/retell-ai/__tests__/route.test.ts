import type { NextRequest } from "next/server";
import { Retell } from "retell-sdk";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { prisma } from "@calcom/prisma";
import type { CalAiPhoneNumber, User, Team } from "@calcom/prisma/client";

import { POST } from "../route";

type MockPhoneNumberWithUser = CalAiPhoneNumber & {
  user: Pick<User, "id" | "email" | "name">;
  team?: never;
};

type MockPhoneNumberWithTeam = CalAiPhoneNumber & {
  user?: never;
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
    (req: NextRequest, context?: { params: Promise<Record<string, string>> }) =>
      handler(req, context || { params: Promise.resolve({}) }),
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

vi.mock("@calcom/prisma", () => ({
  prisma: {
    calAiPhoneNumber: {
      findFirst: vi.fn(),
    },
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
    };

    vi.mocked(prisma.calAiPhoneNumber.findFirst).mockResolvedValue(mockPhoneNumber);

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
        },
      },
    };

    const request = createMockRequest(body, "valid-signature");
    const response = await callPOST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockChargeCredits).toHaveBeenCalledWith({
      userId: 1,
      teamId: undefined,
      credits: 180,
    });
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
    };

    vi.mocked(prisma.calAiPhoneNumber.findFirst).mockResolvedValue(mockTeamPhoneNumber);

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
        },
      },
    };

    const request = createMockRequest(body, "valid-signature");
    const response = await callPOST(request);

    expect(response.status).toBe(200);
    expect(mockChargeCredits).toHaveBeenCalledWith({
      userId: undefined,
      teamId: 5,
      credits: 90,
    });
  });

  it("should handle missing call cost", async () => {
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
      },
    };

    const request = createMockRequest(body, "valid-signature");
    const response = await callPOST(request);

    expect(response.status).toBe(200);
    expect(prisma.calAiPhoneNumber.findFirst).not.toHaveBeenCalled();
  });

  it("should handle phone number not found", async () => {
    vi.mocked(Retell.verify).mockReturnValue(true);
    vi.mocked(prisma.calAiPhoneNumber.findFirst).mockResolvedValue(null);

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
    };

    vi.mocked(prisma.calAiPhoneNumber.findFirst).mockResolvedValue(mockPhoneNumber);

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
        },
      },
    };

    const request = createMockRequest(body, "valid-signature");
    const response = await callPOST(request);

    expect(response.status).toBe(200);
    expect(mockChargeCredits).not.toHaveBeenCalled();
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

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Internal server error");
  });

  it("should calculate credits correctly", async () => {
    const testCases = [
      { cost: 10, expectedCredits: 18 },
      { cost: 55, expectedCredits: 99 },
      { cost: 100, expectedCredits: 180 },
      { cost: 1, expectedCredits: 2 },
    ];

    for (const { cost, expectedCredits } of testCases) {
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
      };

      vi.mocked(prisma.calAiPhoneNumber.findFirst).mockResolvedValue(mockPhoneNumber);
      mockHasAvailableCredits.mockResolvedValue(true);
      mockChargeCredits.mockResolvedValue(undefined);

      const body: RetellWebhookBody = {
        event: "call_analyzed",
        call: {
          call_id: `test-call-${cost}`,
          from_number: "+1234567890",
          to_number: "+0987654321",
          direction: "outbound",
          call_status: "completed",
          start_timestamp: 1234567890,
          call_cost: {
            combined_cost: cost,
          },
        },
      };

      const request = createMockRequest(body, "valid-signature");
      await callPOST(request);

      expect(mockChargeCredits).toHaveBeenCalledWith({
        userId: 1,
        teamId: undefined,
        credits: expectedCredits,
      });
    }
  });
});
