import type { PrismaAttributeToUserRepository } from "@calcom/features/attributes/repositories/PrismaAttributeToUserRepository";
import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConditionIdentifierEnum,
  ConditionOperatorEnum,
  type IAttributeSyncRule,
  RuleOperatorEnum,
} from "../repositories/IIntegrationAttributeSyncRepository";
import { AttributeSyncRuleService } from "./AttributeSyncRuleService";

vi.mock("@calcom/features/attributes/di/AttributeService.container", () => ({
  getAttributeService: vi.fn(() => ({
    getUsersAttributesByOrgMembershipId: vi.fn(),
  })),
}));

import { getAttributeService } from "@calcom/features/attributes/di/AttributeService.container";

describe("AttributeSyncRuleService", () => {
  let service: AttributeSyncRuleService;
  let mockMembershipRepository: {
    findAllByUserId: ReturnType<typeof vi.fn>;
  };
  let mockAttributeToUserRepository: {
    findManyIncludeAttribute: ReturnType<typeof vi.fn>;
  };
  let mockAttributeService: {
    getUsersAttributesByOrgMembershipId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetAllMocks();

    mockMembershipRepository = {
      findAllByUserId: vi.fn(),
    };

    mockAttributeToUserRepository = {
      findManyIncludeAttribute: vi.fn(),
    };

    mockAttributeService = {
      getUsersAttributesByOrgMembershipId: vi.fn(),
    };

    vi.mocked(getAttributeService).mockReturnValue(mockAttributeService);

    service = new AttributeSyncRuleService({
      membershipRepository: mockMembershipRepository as unknown as MembershipRepository,
      attributeToUserRepository: mockAttributeToUserRepository as unknown as PrismaAttributeToUserRepository,
    });
  });

  describe("shouldSyncApplyToUser", () => {
    describe("team conditions", () => {
      it("should return true when user is in specified team with IN operator and AND rule", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.TEAM_ID,
              operator: ConditionOperatorEnum.IN,
              value: [10],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([
          { teamId: 10, accepted: true },
          { teamId: 30, accepted: true },
        ]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({});

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(true);
        expect(mockMembershipRepository.findAllByUserId).toHaveBeenCalledWith({
          userId: 1,
          filters: { accepted: true },
        });
      });

      it("should return false when user is not in any specified team with IN operator and AND rule", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.TEAM_ID,
              operator: ConditionOperatorEnum.IN,
              value: [10, 20],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([
          { teamId: 30, accepted: true },
          { teamId: 40, accepted: true },
        ]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({});

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(false);
      });

      it("should return true when user is not in specified team with NOT_IN operator", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.TEAM_ID,
              operator: ConditionOperatorEnum.NOT_IN,
              value: [10],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([{ teamId: 20, accepted: true }]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({});

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(true);
      });

      it("should return false when user is in specified team with NOT_IN operator", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.TEAM_ID,
              operator: ConditionOperatorEnum.NOT_IN,
              value: [10],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([{ teamId: 10, accepted: true }]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({});

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(false);
      });

      it("should evaluate multiple team IDs in a single condition - all must match for AND rule", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.TEAM_ID,
              operator: ConditionOperatorEnum.IN,
              value: [10, 20],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([
          { teamId: 10, accepted: true },
          { teamId: 20, accepted: true },
        ]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({});

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(true);
      });

      it("should return false when user is not in all specified teams with IN operator and AND rule", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.TEAM_ID,
              operator: ConditionOperatorEnum.IN,
              value: [10, 20, 30],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([
          { teamId: 10, accepted: true },
          { teamId: 20, accepted: true },
        ]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({});

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(false);
      });

      it("should return true when user is in any specified team with IN operator and OR rule", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.OR,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.TEAM_ID,
              operator: ConditionOperatorEnum.IN,
              value: [10, 20, 30],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([{ teamId: 10, accepted: true }]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({});

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(true);
      });
    });

    describe("attribute conditions", () => {
      it("should return true when user has matching SINGLE_SELECT attribute with EQUALS operator", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
              attributeId: "attr-1",
              operator: ConditionOperatorEnum.EQUALS,
              value: ["option-1"],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({
          "attr-1": {
            type: "SINGLE_SELECT",
            optionId: "option-1",
            value: "Option 1",
          },
        });

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(true);
      });

      it("should return false when user has non-matching SINGLE_SELECT attribute with EQUALS operator", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
              attributeId: "attr-1",
              operator: ConditionOperatorEnum.EQUALS,
              value: ["option-1"],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({
          "attr-1": {
            type: "SINGLE_SELECT",
            optionId: "option-2",
            value: "Option 2",
          },
        });

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(false);
      });

      it("should return true when user has matching TEXT attribute with EQUALS operator (case-insensitive)", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
              attributeId: "attr-1",
              operator: ConditionOperatorEnum.EQUALS,
              value: ["ENGINEERING"],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({
          "attr-1": {
            type: "TEXT",
            optionId: null,
            value: "engineering",
          },
        });

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(true);
      });

      it("should return true when user has MULTI_SELECT attribute containing all required options with IN operator", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
              attributeId: "attr-1",
              operator: ConditionOperatorEnum.IN,
              value: ["option-1", "option-2"],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({
          "attr-1": {
            type: "MULTI_SELECT",
            optionIds: new Set(["option-1", "option-2", "option-3"]),
            values: new Set(["Option 1", "Option 2", "Option 3"]),
          },
        });

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(true);
      });

      it("should return false when user has MULTI_SELECT attribute missing some required options with IN operator", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
              attributeId: "attr-1",
              operator: ConditionOperatorEnum.IN,
              value: ["option-1", "option-2"],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({
          "attr-1": {
            type: "MULTI_SELECT",
            optionIds: new Set(["option-1", "option-3"]),
            values: new Set(["Option 1", "Option 3"]),
          },
        });

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(false);
      });

      it("should return true when user has MULTI_SELECT attribute without any excluded options with NOT_IN operator", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
              attributeId: "attr-1",
              operator: ConditionOperatorEnum.NOT_IN,
              value: ["option-4", "option-5"],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({
          "attr-1": {
            type: "MULTI_SELECT",
            optionIds: new Set(["option-1", "option-2"]),
            values: new Set(["Option 1", "Option 2"]),
          },
        });

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(true);
      });

      it("should return false when user has MULTI_SELECT attribute with some excluded options with NOT_IN operator", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
              attributeId: "attr-1",
              operator: ConditionOperatorEnum.NOT_IN,
              value: ["option-1", "option-5"],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({
          "attr-1": {
            type: "MULTI_SELECT",
            optionIds: new Set(["option-1", "option-2"]),
            values: new Set(["Option 1", "Option 2"]),
          },
        });

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(false);
      });

      it("should return false when user does not have the attribute with IN/EQUALS operator", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
              attributeId: "attr-1",
              operator: ConditionOperatorEnum.IN,
              value: ["option-1"],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({});

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(false);
      });

      it("should return true when user does not have the attribute with NOT_IN/NOT_EQUALS operator", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
              attributeId: "attr-1",
              operator: ConditionOperatorEnum.NOT_IN,
              value: ["option-1"],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({});

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(true);
      });

      it("should return true when user has non-matching SINGLE_SELECT attribute with NOT_EQUALS operator", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
              attributeId: "attr-1",
              operator: ConditionOperatorEnum.NOT_EQUALS,
              value: ["option-1"],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({
          "attr-1": {
            type: "SINGLE_SELECT",
            optionId: "option-2",
            value: "Option 2",
          },
        });

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(true);
      });
    });

    describe("rule operators", () => {
      it("should return true with AND operator when all conditions pass", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.TEAM_ID,
              operator: ConditionOperatorEnum.IN,
              value: [10],
            },
            {
              identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
              attributeId: "attr-1",
              operator: ConditionOperatorEnum.EQUALS,
              value: ["option-1"],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([{ teamId: 10, accepted: true }]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({
          "attr-1": {
            type: "SINGLE_SELECT",
            optionId: "option-1",
            value: "Option 1",
          },
        });

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(true);
      });

      it("should return false with AND operator when any condition fails", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.TEAM_ID,
              operator: ConditionOperatorEnum.IN,
              value: [10],
            },
            {
              identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
              attributeId: "attr-1",
              operator: ConditionOperatorEnum.EQUALS,
              value: ["option-1"],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([{ teamId: 10, accepted: true }]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({
          "attr-1": {
            type: "SINGLE_SELECT",
            optionId: "option-2",
            value: "Option 2",
          },
        });

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(false);
      });

      it("should return true with OR operator when any condition passes", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.OR,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.TEAM_ID,
              operator: ConditionOperatorEnum.IN,
              value: [10],
            },
            {
              identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
              attributeId: "attr-1",
              operator: ConditionOperatorEnum.EQUALS,
              value: ["option-1"],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([{ teamId: 20, accepted: true }]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({
          "attr-1": {
            type: "SINGLE_SELECT",
            optionId: "option-1",
            value: "Option 1",
          },
        });

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(true);
      });

      it("should return false with OR operator when all conditions fail", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.OR,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.TEAM_ID,
              operator: ConditionOperatorEnum.IN,
              value: [10],
            },
            {
              identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
              attributeId: "attr-1",
              operator: ConditionOperatorEnum.EQUALS,
              value: ["option-1"],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([{ teamId: 20, accepted: true }]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({
          "attr-1": {
            type: "SINGLE_SELECT",
            optionId: "option-2",
            value: "Option 2",
          },
        });

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("should return true with AND operator and empty conditions", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({});

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(true);
      });

      it("should return false with OR operator and empty conditions", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.OR,
          conditions: [],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({});

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(false);
      });

      it("should handle user with no team memberships", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.TEAM_ID,
              operator: ConditionOperatorEnum.IN,
              value: [10],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({});

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(false);
      });

      it("should handle NUMBER attribute type with EQUALS operator", async () => {
        const user = { id: 1, organizationId: 100 };
        const attributeSyncRule: IAttributeSyncRule = {
          operator: RuleOperatorEnum.AND,
          conditions: [
            {
              identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
              attributeId: "attr-1",
              operator: ConditionOperatorEnum.EQUALS,
              value: ["42"],
            },
          ],
        };

        mockMembershipRepository.findAllByUserId.mockResolvedValue([]);
        mockAttributeService.getUsersAttributesByOrgMembershipId.mockResolvedValue({
          "attr-1": {
            type: "NUMBER",
            optionId: null,
            value: "42",
          },
        });

        const result = await service.shouldSyncApplyToUser({ user, attributeSyncRule });

        expect(result).toBe(true);
      });
    });
  });
});
