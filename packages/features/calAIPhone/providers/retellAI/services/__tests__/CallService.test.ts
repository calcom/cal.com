import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { HttpError } from "@calcom/lib/http-error";

import { CallService } from "../CallService";
import { setupBasicMocks, createMockCall, createMockDatabaseAgent, TestError } from "./test-utils";

vi.mock("@calcom/features/ee/billing/credit-service", () => ({
  CreditService: vi.fn(),
}));

vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
  checkRateLimitAndThrowError: vi.fn(),
}));

describe("CallService", () => {
  let service: CallService;
  let mocks: ReturnType<typeof setupBasicMocks>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mocks = setupBasicMocks();

    const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
    const { checkRateLimitAndThrowError } = await import("@calcom/lib/checkRateLimitAndThrowError");

    vi.mocked(CreditService).mockImplementation(() => ({
      getAllCredits: vi.fn().mockResolvedValue({
        totalRemainingMonthlyCredits: 100,
        additionalCredits: 50,
      }),
    }));

    vi.mocked(checkRateLimitAndThrowError).mockResolvedValue(undefined);

    service = new CallService(mocks.mockRetellRepository, mocks.mockAgentRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createPhoneCall", () => {
    const validCallData = {
      from_number: "+1234567890",
      to_number: "+0987654321",
    };

    it("should successfully create phone call", async () => {
      const mockCall = createMockCall();
      mocks.mockRetellRepository.createPhoneCall.mockResolvedValue(mockCall);

      const result = await service.createPhoneCall(validCallData);

      expect(result).toEqual(mockCall);
      expect(mocks.mockRetellRepository.createPhoneCall).toHaveBeenCalledWith(validCallData);
    });

    it("should create phone call with dynamic variables", async () => {
      const mockCall = createMockCall();
      mocks.mockRetellRepository.createPhoneCall.mockResolvedValue(mockCall);

      const callDataWithVariables = {
        ...validCallData,
        retell_llm_dynamic_variables: {
          name: "John Doe",
          company: "Acme Corp",
        },
      };

      await service.createPhoneCall(callDataWithVariables);

      expect(mocks.mockRetellRepository.createPhoneCall).toHaveBeenCalledWith(callDataWithVariables);
    });

    it("should handle Retell API errors", async () => {
      mocks.mockRetellRepository.createPhoneCall.mockRejectedValue(new TestError("Retell API error"));

      await expect(service.createPhoneCall(validCallData)).rejects.toThrow(
        "Failed to create phone call from +1234567890 to +0987654321"
      );
    });
  });

  describe("createTestCall", () => {
    const validTestCallData = {
      agentId: "agent-123",
      phoneNumber: "+0987654321",
      userId: 1,
    };

    const mockAgentWithPhoneNumber = createMockDatabaseAgent({
      outboundPhoneNumbers: [
        {
          phoneNumber: "+1234567890",
        },
      ],
    });

    it("should successfully create test call", async () => {
      const mockCall = createMockCall();

      mocks.mockAgentRepository.findByIdWithCallAccess.mockResolvedValue(mockAgentWithPhoneNumber);
      mocks.mockRetellRepository.createPhoneCall.mockResolvedValue(mockCall);

      const result = await service.createTestCall(validTestCallData);

      expect(result).toEqual({
        callId: "call-123",
        status: "registered",
        message: "Call initiated to +0987654321 with call_id call-123",
      });

      expect(mocks.mockRetellRepository.createPhoneCall).toHaveBeenCalledWith({
        from_number: "+1234567890",
        to_number: "+0987654321",
      });
    });

    it("should handle team-based credit validation", async () => {
      mocks.mockAgentRepository.findByIdWithCallAccess.mockResolvedValue(mockAgentWithPhoneNumber);
      mocks.mockRetellRepository.createPhoneCall.mockResolvedValue(createMockCall());

      const result = await service.createTestCall({
        ...validTestCallData,
        teamId: 5,
      });

      expect(result).toEqual({
        callId: "call-123",
        status: "registered",
        message: "Call initiated to +0987654321 with call_id call-123",
      });
    });

    it("should throw error if insufficient credits", async () => {
      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
      vi.mocked(CreditService).mockImplementation(() => ({
        getAllCredits: vi.fn().mockResolvedValue({
          totalRemainingMonthlyCredits: 2,
          additionalCredits: 1,
        }),
      }));

      await expect(service.createTestCall(validTestCallData)).rejects.toThrow(
        "Insufficient credits to make test call. Need 5 credits, have 3"
      );
    });

    it("should throw error if no phone number provided", async () => {
      await expect(
        service.createTestCall({
          agentId: "agent-123",
          userId: 1,
        })
      ).rejects.toThrow("Phone number is required for test call");
    });

    it("should throw error if agent not found", async () => {
      mocks.mockAgentRepository.findByIdWithCallAccess.mockResolvedValue(null);

      await expect(service.createTestCall(validTestCallData)).rejects.toThrow(
        "Agent not found or you don't have permission to use it"
      );
    });

    it("should throw error if agent has no phone number", async () => {
      const agentWithoutPhoneNumber = createMockDatabaseAgent({
        outboundPhoneNumbers: [],
      });

      mocks.mockAgentRepository.findByIdWithCallAccess.mockResolvedValue(agentWithoutPhoneNumber);

      await expect(service.createTestCall(validTestCallData)).rejects.toThrow(
        "Agent must have a phone number assigned to make calls"
      );
    });

    it("should handle call creation failure", async () => {
      mocks.mockAgentRepository.findByIdWithCallAccess.mockResolvedValue(mockAgentWithPhoneNumber);
      mocks.mockRetellRepository.createPhoneCall.mockRejectedValue(new TestError("Call creation failed"));

      await expect(service.createTestCall(validTestCallData)).rejects.toThrow(
        "Failed to create phone call from +1234567890 to +0987654321"
      );
    });

    it("should handle rate limiting errors", async () => {
      mocks.mockAgentRepository.findByIdWithCallAccess.mockResolvedValue(mockAgentWithPhoneNumber);
      mocks.mockRetellRepository.createPhoneCall.mockResolvedValue(createMockCall());

      vi.mocked(checkRateLimitAndThrowError).mockRejectedValue(new Error("Rate limit exceeded"));

      await expect(service.createTestCall(validTestCallData)).rejects.toThrow("Rate limit exceeded");

      expect(checkRateLimitAndThrowError).toHaveBeenCalledWith({
        rateLimitingType: "core",
        identifier: "test-call:1",
      });
    });

    it("should call rate limiting with correct identifier for different users", async () => {
      mocks.mockAgentRepository.findByIdWithCallAccess.mockResolvedValue(mockAgentWithPhoneNumber);
      mocks.mockRetellRepository.createPhoneCall.mockResolvedValue(createMockCall());

      vi.mocked(checkRateLimitAndThrowError).mockResolvedValue(undefined);

      await service.createTestCall({
        ...validTestCallData,
        userId: 42,
      });

      expect(checkRateLimitAndThrowError).toHaveBeenCalledWith({
        rateLimitingType: "core",
        identifier: "test-call:42",
      });
    });

    it("should handle credit service errors", async () => {
      mocks.mockAgentRepository.findByIdWithCallAccess.mockResolvedValue(mockAgentWithPhoneNumber);
      mocks.mockRetellRepository.createPhoneCall.mockResolvedValue(createMockCall());

      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
      vi.mocked(CreditService).mockImplementation(() => ({
        getAllCredits: vi.fn().mockRejectedValue(new TestError("Credit service unavailable")),
      }));

      await expect(service.createTestCall(validTestCallData)).rejects.toThrow(
        "Unable to validate credits. Please try again."
      );
    });

    it("should handle insufficient credits properly", async () => {
      mocks.mockAgentRepository.findByIdWithCallAccess.mockResolvedValue(mockAgentWithPhoneNumber);
      mocks.mockRetellRepository.createPhoneCall.mockResolvedValue(createMockCall());

      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
      vi.mocked(CreditService).mockImplementation(() => ({
        getAllCredits: vi.fn().mockResolvedValue({
          totalRemainingMonthlyCredits: 2,
          additionalCredits: 1,
        }),
      }));

      await expect(service.createTestCall(validTestCallData)).rejects.toThrow(
        "Insufficient credits to make test call. Need 5 credits, have 3"
      );
    });

    it("should handle null credit values gracefully", async () => {
      mocks.mockAgentRepository.findByIdWithCallAccess.mockResolvedValue(mockAgentWithPhoneNumber);
      mocks.mockRetellRepository.createPhoneCall.mockResolvedValue(createMockCall());

      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
      vi.mocked(CreditService).mockImplementation(() => ({
        getAllCredits: vi.fn().mockResolvedValue({
          totalRemainingMonthlyCredits: null,
          additionalCredits: null,
        }),
      }));

      await expect(service.createTestCall(validTestCallData)).rejects.toThrow(
        "Insufficient credits to make test call. Need 5 credits, have 0"
      );
    });
  });
});
