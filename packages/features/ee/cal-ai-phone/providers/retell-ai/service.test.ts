import { describe, it, expect, vi, beforeEach } from "vitest";

import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import { RetellAIError } from "./errors";
import { RetellAIService } from "./service";
import type { RetellAIRepository } from "./types";

vi.mock("@calcom/lib/server/repository/phoneNumber", () => ({
  PhoneNumberRepository: {
    createPhoneNumber: vi.fn(),
    findMinimalPhoneNumber: vi.fn(),
    deletePhoneNumber: vi.fn(),
  },
}));

describe("RetellAIService", () => {
  let service: RetellAIService;
  let mockRepository: RetellAIRepository & { [K in keyof RetellAIRepository]: vi.Mock };

  beforeEach(() => {
    const repository = {
      createLLM: vi.fn(),
      getLLM: vi.fn(),
      updateLLM: vi.fn(),
      deleteLLM: vi.fn(),
      createAgent: vi.fn(),
      getAgent: vi.fn(),
      updateAgent: vi.fn(),
      deleteAgent: vi.fn(),
      createPhoneNumber: vi.fn(),
      importPhoneNumber: vi.fn(),
      deletePhoneNumber: vi.fn(),
      getPhoneNumber: vi.fn(),
      updatePhoneNumber: vi.fn(),
      createPhoneCall: vi.fn(),
    };
    mockRepository = repository as unknown as RetellAIRepository;

    service = new RetellAIService(mockRepository);
  });

  describe("setupAIConfiguration", () => {
    it("should create LLM and agent with minimal configuration", async () => {
      const mockLLM = { llm_id: "llm-123" };
      const mockAgent = { agent_id: "agent-123" };
      mockRepository.createLLM.mockResolvedValue(mockLLM);
      mockRepository.createAgent.mockResolvedValue(mockAgent);

      const result = await service.setupAIConfiguration({});

      expect(result).toEqual({ llmId: "llm-123", agentId: "agent-123" });
      expect(mockRepository.createLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          general_tools: expect.arrayContaining([
            {
              type: "end_call",
              name: "end_call",
              description: expect.any(String),
            },
          ]),
        })
      );
    });

    it("should include Cal.com tools when API key and eventTypeId are provided", async () => {
      const mockLLM = { llm_id: "llm-123" };
      const mockAgent = { agent_id: "agent-123" };

      mockRepository.createLLM.mockResolvedValue(mockLLM);
      mockRepository.createAgent.mockResolvedValue(mockAgent);

      await service.setupAIConfiguration({
        calApiKey: "cal-key",
        eventTypeId: 123,
        timeZone: "UTC",
      });

      expect(mockRepository.createLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          general_tools: expect.arrayContaining([
            expect.objectContaining({ type: "check_availability_cal" }),
            expect.objectContaining({ type: "book_appointment_cal" }),
          ]),
        })
      );
    });
  });

  describe("deleteAIConfiguration", () => {
    it("should handle successful deletion of both LLM and agent", async () => {
      mockRepository.deleteAgent.mockResolvedValue(undefined);
      mockRepository.deleteLLM.mockResolvedValue(undefined);

      const result = await service.deleteAIConfiguration({
        llmId: "llm-123",
        agentId: "agent-123",
      });

      expect(result).toEqual({
        success: true,
        errors: [],
        deleted: { llm: true, agent: true },
      });
    });

    it("should handle 404 errors gracefully", async () => {
      mockRepository.deleteAgent.mockRejectedValue(new RetellAIError("Agent not found", "404"));
      mockRepository.deleteLLM.mockRejectedValue(new RetellAIError("LLM not found", "404"));

      const result = await service.deleteAIConfiguration({
        llmId: "llm-123",
        agentId: "agent-123",
      });

      expect(result).toEqual({
        success: true,
        errors: [],
        deleted: { llm: true, agent: true },
      });
    });

    it("should handle partial deletion failure", async () => {
      mockRepository.deleteAgent.mockResolvedValue(undefined);
      mockRepository.deleteLLM.mockRejectedValue(new Error("Network error"));

      const result = await service.deleteAIConfiguration({
        llmId: "llm-123",
        agentId: "agent-123",
      });

      expect(result).toEqual({
        success: false,
        errors: ["Failed to delete LLM: Error: Network error"],
        deleted: { llm: false, agent: true },
      });
    });
  });

  describe("deletePhoneNumber", () => {
    it("should throw error if phone number is active", async () => {
      const { PhoneNumberRepository } = await import("@calcom/lib/server/repository/phoneNumber");
      (PhoneNumberRepository.findMinimalPhoneNumber as any).mockResolvedValue({
        subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
      });

      await expect(
        service.deletePhoneNumber({
          phoneNumber: "+1234567890",
          userId: 1,
          deleteFromDB: true,
        })
      ).rejects.toThrow("Phone number is still active");
    });

    it("should throw error if phone number is cancelled", async () => {
      const { PhoneNumberRepository } = await import("@calcom/lib/server/repository/phoneNumber");
      (PhoneNumberRepository.findMinimalPhoneNumber as any).mockResolvedValue({
        subscriptionStatus: PhoneNumberSubscriptionStatus.CANCELLED,
      });

      await expect(
        service.deletePhoneNumber({
          phoneNumber: "+1234567890",
          userId: 1,
          deleteFromDB: true,
        })
      ).rejects.toThrow("Phone number is already cancelled");
    });

    it("should delete from both DB and provider when deleteFromDB is true", async () => {
      const { PhoneNumberRepository } = await import("@calcom/lib/server/repository/phoneNumber");
      (PhoneNumberRepository.findMinimalPhoneNumber as any).mockResolvedValue({
        subscriptionStatus: PhoneNumberSubscriptionStatus.INCOMPLETE,
      });

      await service.deletePhoneNumber({
        phoneNumber: "+1234567890",
        userId: 1,
        deleteFromDB: true,
      });

      expect(PhoneNumberRepository.deletePhoneNumber).toHaveBeenCalled();
      expect(mockRepository.deletePhoneNumber).toHaveBeenCalled();
    });
  });

  describe("importPhoneNumber", () => {
    it("should import phone number and create DB record", async () => {
      const mockImportedNumber = { phone_number: "+1234567890" };
      mockRepository.importPhoneNumber.mockResolvedValue(mockImportedNumber);
      const { PhoneNumberRepository } = await import("@calcom/lib/server/repository/phoneNumber");

      const result = await service.importPhoneNumber({
        phone_number: "+1234567890",
        termination_uri: "https://example.com",
        sip_trunk_auth_username: "user",
        sip_trunk_auth_password: "pass",
        userId: 1,
      });

      expect(result).toEqual(mockImportedNumber);
      expect(PhoneNumberRepository.createPhoneNumber).toHaveBeenCalledWith({
        phoneNumber: "+1234567890",
        userId: 1,
        provider: "Custom telephony",
      });
    });
  });

  describe("createPhoneCall", () => {
    it("should create phone call with dynamic variables", async () => {
      const mockCall = { call_id: "call-123" };
      mockRepository.createPhoneCall.mockResolvedValue(mockCall);

      const result = await service.createPhoneCall({
        from_number: "+1234567890",
        to_number: "+0987654321",
        retell_llm_dynamic_variables: {
          name: "John",
          email: "john@example.com",
        },
      });

      expect(result).toEqual(mockCall);
      expect(mockRepository.createPhoneCall).toHaveBeenCalledWith({
        from_number: "+1234567890",
        to_number: "+0987654321",
        retell_llm_dynamic_variables: {
          name: "John",
          email: "john@example.com",
        },
      });
    });
  });
});
