import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CallService } from "../CallService";
import { createMockCall, createMockDatabaseAgent, setupBasicMocks, TestError } from "./test-utils";

vi.mock("@calcom/features/ee/billing/credit-service", () => ({
  CreditService: vi.fn(),
}));

vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
  checkRateLimitAndThrowError: vi.fn(),
}));

describe("CallService", () => {
  let service: CallService;
  let mocks: ReturnType<typeof setupBasicMocks>;
  let mockRetellAIService: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mocks = setupBasicMocks();

    const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
    const { checkRateLimitAndThrowError } = await import("@calcom/lib/checkRateLimitAndThrowError");

    vi.mocked(CreditService).mockImplementation(function () {
      return {
        hasAvailableCredits: vi.fn().mockResolvedValue(true),
      };
    });

    vi.mocked(checkRateLimitAndThrowError).mockResolvedValue(undefined);

    mockRetellAIService = {
      updateToolsFromAgentId: vi.fn().mockResolvedValue(undefined),
    };

    service = new CallService({
      retellRepository: mocks.mockRetellRepository,
      agentRepository: mocks.mockAgentRepository,
    });
    service.setRetellAIService(mockRetellAIService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createPhoneCall", () => {
    const validCallData = {
      fromNumber: "+1234567890",
      toNumber: "+0987654321",
    };

    it("should successfully create phone call", async () => {
      const mockCall = createMockCall();
      mocks.mockRetellRepository.createPhoneCall.mockResolvedValue(mockCall);

      const result = await service.createPhoneCall(validCallData);

      expect(result).toEqual(mockCall);
      expect(mocks.mockRetellRepository.createPhoneCall).toHaveBeenCalledWith({
        fromNumber: "+1234567890",
        toNumber: "+0987654321",
        dynamicVariables: undefined,
      });
    });

    it("should create phone call with dynamic variables", async () => {
      const mockCall = createMockCall();
      mocks.mockRetellRepository.createPhoneCall.mockResolvedValue(mockCall);

      const callDataWithVariables = {
        ...validCallData,
        dynamicVariables: {
          name: "John Doe",
          company: "Acme Corp",
        },
      };

      await service.createPhoneCall(callDataWithVariables);

      expect(mocks.mockRetellRepository.createPhoneCall).toHaveBeenCalledWith({
        fromNumber: "+1234567890",
        toNumber: "+0987654321",
        dynamicVariables: {
          name: "John Doe",
          company: "Acme Corp",
        },
      });
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
      timeZone: "America/New_York",
      eventTypeId: 123,
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
        fromNumber: "+1234567890",
        toNumber: "+0987654321",
        dynamicVariables: expect.objectContaining({
          EVENT_NAME: "Test Call with Agent",
          TIMEZONE: "America/New_York",
        }),
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

    it("should throw error if no phone number provided", async () => {
      await expect(
        service.createTestCall({
          agentId: "agent-123",
          userId: 1,
          timeZone: "America/New_York",
          eventTypeId: 123,
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
        identifier: "createTestCall:1",
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
        identifier: "createTestCall:42",
      });
    });

    it("should handle credit service errors", async () => {
      mocks.mockAgentRepository.findByIdWithCallAccess.mockResolvedValue(mockAgentWithPhoneNumber);
      mocks.mockRetellRepository.createPhoneCall.mockResolvedValue(createMockCall());

      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
      vi.mocked(CreditService).mockImplementation(function () {
        return {
          getAllCredits: vi.fn().mockRejectedValue(new TestError("Credit service unavailable")),
        };
      });

      await expect(service.createTestCall(validTestCallData)).rejects.toThrow(
        "Unable to validate credits. Please try again."
      );
    });

    it("should handle insufficient credits properly", async () => {
      mocks.mockAgentRepository.findByIdWithCallAccess.mockResolvedValue(mockAgentWithPhoneNumber);
      mocks.mockRetellRepository.createPhoneCall.mockResolvedValue(createMockCall());

      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
      vi.mocked(CreditService).mockImplementation(function () {
        return {
          hasAvailableCredits: vi.fn().mockResolvedValue(false),
        };
      });

      await expect(service.createTestCall(validTestCallData)).rejects.toThrow(
        "Insufficient credits to make test call. Please purchase more credits."
      );
    });

    it("should handle null credit values gracefully", async () => {
      mocks.mockAgentRepository.findByIdWithCallAccess.mockResolvedValue(mockAgentWithPhoneNumber);
      mocks.mockRetellRepository.createPhoneCall.mockResolvedValue(createMockCall());

      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
      vi.mocked(CreditService).mockImplementation(function () {
        return {
          hasAvailableCredits: vi.fn().mockResolvedValue(false),
        };
      });

      await expect(service.createTestCall(validTestCallData)).rejects.toThrow(
        "Insufficient credits to make test call. Please purchase more credits."
      );
    });
  });
});
