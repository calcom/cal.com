import { prisma } from "@calcom/prisma/__mocks__/prisma";

import { describe, it, expect, vi, beforeEach } from "vitest";

import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { isAuthorized } from "@calcom/features/ee/workflows/lib/isAuthorized";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import { WorkflowActions } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import { deleteHandler } from "./delete.handler";
import { removeSmsReminderFieldForEventTypes, removeAIAgentCallPhoneNumberFieldForEventTypes } from "./util";

vi.mock("@calcom/prisma", () => ({
  prisma,
}));

vi.mock("@calcom/features/calAIPhone", () => ({
  createDefaultAIPhoneServiceProvider: vi.fn(),
}));

vi.mock("@calcom/features/ee/workflows/repositories/WorkflowRepository", () => ({
  WorkflowRepository: {
    deleteAllWorkflowReminders: vi.fn(),
  },
}));

vi.mock("@calcom/features/ee/workflows/lib/isAuthorized", () => ({
  isAuthorized: vi.fn(),
}));

vi.mock("./util", () => ({
  removeSmsReminderFieldForEventTypes: vi.fn(),
  removeAIAgentCallPhoneNumberFieldForEventTypes: vi.fn(),
}));

describe("deleteHandler", () => {
  const mockCreateDefaultAIPhoneServiceProvider = vi.mocked(createDefaultAIPhoneServiceProvider);
  const mockIsAuthorized = vi.mocked(isAuthorized);
  const mockRemoveSmsReminderFieldForEventTypes = vi.mocked(removeSmsReminderFieldForEventTypes);
  const mockRemoveAIAgentCallPhoneNumberFieldForEventTypes = vi.mocked(
    removeAIAgentCallPhoneNumberFieldForEventTypes
  );
  const mockDeleteAllWorkflowReminders = vi.mocked(WorkflowRepository.deleteAllWorkflowReminders);

  const mockUser = {
    id: 123,
    name: "Test User",
    email: "test@example.com",
  };

  const mockCtx = {
    user: mockUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authorization", () => {
    it("should throw UNAUTHORIZED when user is not authorized or workflow not found", async () => {
      const workflowId = 1;

      prisma.workflow.findUnique.mockResolvedValue({
        id: workflowId,
        teamId: 456,
        userId: 789,
        activeOn: [],
        activeOnTeams: [],
        steps: [],
        team: null,
      });
      mockIsAuthorized.mockResolvedValue(false);

      await expect(deleteHandler({ ctx: mockCtx, input: { id: workflowId } })).rejects.toThrow(
        new TRPCError({ code: "UNAUTHORIZED" })
      );

      prisma.workflow.findUnique.mockResolvedValue(null);

      await expect(deleteHandler({ ctx: mockCtx, input: { id: workflowId } })).rejects.toThrow(
        new TRPCError({ code: "UNAUTHORIZED" })
      );
    });
  });

  describe("Booking field cleanup", () => {
    it("should remove both SMS reminder and AI agent phone number fields", async () => {
      const workflowId = 1;
      const eventTypeIds = [10, 20];
      const mockWorkflow = {
        id: workflowId,
        teamId: null,
        userId: mockUser.id,
        activeOn: eventTypeIds.map((id) => ({ eventTypeId: id })),
        activeOnTeams: [],
        steps: [],
        team: null,
      };

      prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockIsAuthorized.mockResolvedValue(true);
      prisma.workflowReminder.findMany.mockResolvedValue([]);
      prisma.workflow.deleteMany.mockResolvedValue({ count: 1 });

      await deleteHandler({ ctx: mockCtx, input: { id: workflowId } });

      expect(mockRemoveSmsReminderFieldForEventTypes).toHaveBeenCalledWith({
        activeOnToRemove: eventTypeIds,
        workflowId: workflowId,
        isOrg: false,
      });

      expect(mockRemoveAIAgentCallPhoneNumberFieldForEventTypes).toHaveBeenCalledWith({
        activeOnToRemove: eventTypeIds,
        workflowId: workflowId,
        isOrg: false,
      });
    });

    it("should handle organization workflows correctly", async () => {
      const workflowId = 1;
      const teamIds = [100, 200];
      const mockWorkflow = {
        id: workflowId,
        teamId: 456,
        userId: mockUser.id,
        activeOn: [],
        activeOnTeams: teamIds.map((id) => ({ teamId: id })),
        steps: [],
        team: {
          isOrganization: true,
        },
      };

      prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockIsAuthorized.mockResolvedValue(true);
      prisma.workflowReminder.findMany.mockResolvedValue([]);
      prisma.workflow.deleteMany.mockResolvedValue({ count: 1 });

      await deleteHandler({ ctx: mockCtx, input: { id: workflowId } });

      expect(mockRemoveSmsReminderFieldForEventTypes).toHaveBeenCalledWith({
        activeOnToRemove: teamIds,
        workflowId: workflowId,
        isOrg: true,
      });

      expect(mockRemoveAIAgentCallPhoneNumberFieldForEventTypes).toHaveBeenCalledWith({
        activeOnToRemove: teamIds,
        workflowId: workflowId,
        isOrg: true,
      });
    });
  });

  describe("CAL AI phone call cleanup", () => {
    let mockAIPhoneService: {
      cancelPhoneNumberSubscription: ReturnType<typeof vi.fn>;
      deletePhoneNumber: ReturnType<typeof vi.fn>;
      deleteAgent: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockAIPhoneService = {
        cancelPhoneNumberSubscription: vi.fn(),
        deletePhoneNumber: vi.fn(),
        deleteAgent: vi.fn(),
      };
      mockCreateDefaultAIPhoneServiceProvider.mockReturnValue(mockAIPhoneService);
    });

    it("should cleanup AI phone resources based on subscription status", async () => {
      const workflowId = 1;
      const mockWorkflow = {
        id: workflowId,
        teamId: null,
        userId: mockUser.id,
        activeOn: [],
        activeOnTeams: [],
        steps: [
          {
            action: WorkflowActions.CAL_AI_PHONE_CALL,
            agent: {
              id: "agent-1",
              outboundPhoneNumbers: [
                {
                  id: "phone-active",
                  phoneNumber: "+1111111111",
                  subscriptionStatus: "ACTIVE",
                },
                {
                  id: "phone-null",
                  phoneNumber: "+2222222222",
                  subscriptionStatus: null,
                },
              ],
            },
          },
        ],
        team: null,
      };

      prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockIsAuthorized.mockResolvedValue(true);
      prisma.workflowReminder.findMany.mockResolvedValue([]);
      prisma.workflow.deleteMany.mockResolvedValue({ count: 1 });

      await deleteHandler({ ctx: mockCtx, input: { id: workflowId } });

      expect(mockAIPhoneService.cancelPhoneNumberSubscription).toHaveBeenCalledWith({
        phoneNumberId: "phone-active",
        userId: mockUser.id,
      });

      expect(mockAIPhoneService.deletePhoneNumber).toHaveBeenCalledWith({
        phoneNumber: "+2222222222",
        userId: mockUser.id,
        deleteFromDB: true,
      });

      expect(mockAIPhoneService.deleteAgent).toHaveBeenCalledWith({
        id: "agent-1",
        userId: mockUser.id,
        teamId: undefined,
      });

      expect(mockRemoveAIAgentCallPhoneNumberFieldForEventTypes).toHaveBeenCalled();
    });
  });

  describe("Workflow deletion flow", () => {
    it("should complete full deletion flow successfully", async () => {
      const workflowId = 1;
      const mockReminders = [
        {
          id: 1,
          workflowStepId: 1,
        },
      ];
      const mockWorkflow = {
        id: workflowId,
        teamId: null,
        userId: mockUser.id,
        activeOn: [{ eventTypeId: 10 }],
        activeOnTeams: [],
        steps: [],
        team: null,
      };

      prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockIsAuthorized.mockResolvedValue(true);
      prisma.workflowReminder.findMany.mockResolvedValue(mockReminders);
      prisma.workflow.deleteMany.mockResolvedValue({ count: 1 });

      const result = await deleteHandler({ ctx: mockCtx, input: { id: workflowId } });

      expect(prisma.workflowReminder.findMany).toHaveBeenCalledWith({
        where: {
          workflowStep: {
            workflowId: workflowId,
          },
        },
      });

      expect(mockDeleteAllWorkflowReminders).toHaveBeenCalledWith(mockReminders);

      expect(mockRemoveSmsReminderFieldForEventTypes).toHaveBeenCalled();
      expect(mockRemoveAIAgentCallPhoneNumberFieldForEventTypes).toHaveBeenCalled();

      expect(prisma.workflow.deleteMany).toHaveBeenCalledWith({
        where: {
          id: workflowId,
        },
      });

      expect(result).toEqual({ id: workflowId });
    });
  });
});
