import type { PrismaAttributeToUserRepository } from "@calcom/features/attributes/repositories/PrismaAttributeToUserRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AttributeService } from "./AttributeService";

describe("AttributeService", () => {
  let service: AttributeService;
  let mockAttributeToUserRepository: {
    findManyIncludeAttribute: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetAllMocks();

    mockAttributeToUserRepository = {
      findManyIncludeAttribute: vi.fn(),
    };

    service = new AttributeService({
      attributeToUserRepository: mockAttributeToUserRepository as unknown as PrismaAttributeToUserRepository,
    });
  });

  describe("getUsersAttributesByOrgMembershipId", () => {
    it("should return empty object when user has no attributes", async () => {
      mockAttributeToUserRepository.findManyIncludeAttribute.mockResolvedValue([]);

      const result = await service.getUsersAttributesByOrgMembershipId({
        userId: 1,
        orgId: 100,
      });

      expect(result).toEqual({});
      expect(mockAttributeToUserRepository.findManyIncludeAttribute).toHaveBeenCalledWith({
        member: { userId: 1, teamId: 100 },
      });
    });

    it("should return SINGLE_SELECT attribute correctly", async () => {
      mockAttributeToUserRepository.findManyIncludeAttribute.mockResolvedValue([
        {
          attributeOptionId: "opt-1",
          attributeOption: {
            value: "Engineering",
            attribute: {
              id: "attr-1",
              type: "SINGLE_SELECT",
            },
          },
        },
      ]);

      const result = await service.getUsersAttributesByOrgMembershipId({
        userId: 1,
        orgId: 100,
      });

      expect(result).toEqual({
        "attr-1": {
          type: "SINGLE_SELECT",
          optionId: "opt-1",
          value: "Engineering",
        },
      });
    });

    it("should return TEXT attribute correctly", async () => {
      mockAttributeToUserRepository.findManyIncludeAttribute.mockResolvedValue([
        {
          attributeOptionId: "opt-1",
          attributeOption: {
            value: "Senior Engineer",
            attribute: {
              id: "attr-1",
              type: "TEXT",
            },
          },
        },
      ]);

      const result = await service.getUsersAttributesByOrgMembershipId({
        userId: 1,
        orgId: 100,
      });

      expect(result).toEqual({
        "attr-1": {
          type: "TEXT",
          optionId: "opt-1",
          value: "Senior Engineer",
        },
      });
    });

    it("should return NUMBER attribute correctly", async () => {
      mockAttributeToUserRepository.findManyIncludeAttribute.mockResolvedValue([
        {
          attributeOptionId: "opt-1",
          attributeOption: {
            value: "42",
            attribute: {
              id: "attr-1",
              type: "NUMBER",
            },
          },
        },
      ]);

      const result = await service.getUsersAttributesByOrgMembershipId({
        userId: 1,
        orgId: 100,
      });

      expect(result).toEqual({
        "attr-1": {
          type: "NUMBER",
          optionId: "opt-1",
          value: "42",
        },
      });
    });

    it("should return MULTI_SELECT attribute with multiple options correctly", async () => {
      mockAttributeToUserRepository.findManyIncludeAttribute.mockResolvedValue([
        {
          attributeOptionId: "opt-1",
          attributeOption: {
            value: "JavaScript",
            attribute: {
              id: "attr-1",
              type: "MULTI_SELECT",
            },
          },
        },
        {
          attributeOptionId: "opt-2",
          attributeOption: {
            value: "TypeScript",
            attribute: {
              id: "attr-1",
              type: "MULTI_SELECT",
            },
          },
        },
        {
          attributeOptionId: "opt-3",
          attributeOption: {
            value: "Python",
            attribute: {
              id: "attr-1",
              type: "MULTI_SELECT",
            },
          },
        },
      ]);

      const result = await service.getUsersAttributesByOrgMembershipId({
        userId: 1,
        orgId: 100,
      });

      expect(result).toEqual({
        "attr-1": {
          type: "MULTI_SELECT",
          optionIds: new Set(["opt-1", "opt-2", "opt-3"]),
          values: new Set(["JavaScript", "TypeScript", "Python"]),
        },
      });
    });

    it("should handle multiple attributes of different types", async () => {
      mockAttributeToUserRepository.findManyIncludeAttribute.mockResolvedValue([
        {
          attributeOptionId: "opt-1",
          attributeOption: {
            value: "Engineering",
            attribute: {
              id: "attr-1",
              type: "SINGLE_SELECT",
            },
          },
        },
        {
          attributeOptionId: "opt-2",
          attributeOption: {
            value: "JavaScript",
            attribute: {
              id: "attr-2",
              type: "MULTI_SELECT",
            },
          },
        },
        {
          attributeOptionId: "opt-3",
          attributeOption: {
            value: "TypeScript",
            attribute: {
              id: "attr-2",
              type: "MULTI_SELECT",
            },
          },
        },
        {
          attributeOptionId: "opt-4",
          attributeOption: {
            value: "Senior Engineer",
            attribute: {
              id: "attr-3",
              type: "TEXT",
            },
          },
        },
      ]);

      const result = await service.getUsersAttributesByOrgMembershipId({
        userId: 1,
        orgId: 100,
      });

      expect(result).toEqual({
        "attr-1": {
          type: "SINGLE_SELECT",
          optionId: "opt-1",
          value: "Engineering",
        },
        "attr-2": {
          type: "MULTI_SELECT",
          optionIds: new Set(["opt-2", "opt-3"]),
          values: new Set(["JavaScript", "TypeScript"]),
        },
        "attr-3": {
          type: "TEXT",
          optionId: "opt-4",
          value: "Senior Engineer",
        },
      });
    });

    it("should overwrite SINGLE_SELECT attribute if multiple values exist (last one wins)", async () => {
      mockAttributeToUserRepository.findManyIncludeAttribute.mockResolvedValue([
        {
          attributeOptionId: "opt-1",
          attributeOption: {
            value: "Engineering",
            attribute: {
              id: "attr-1",
              type: "SINGLE_SELECT",
            },
          },
        },
        {
          attributeOptionId: "opt-2",
          attributeOption: {
            value: "Sales",
            attribute: {
              id: "attr-1",
              type: "SINGLE_SELECT",
            },
          },
        },
      ]);

      const result = await service.getUsersAttributesByOrgMembershipId({
        userId: 1,
        orgId: 100,
      });

      expect(result).toEqual({
        "attr-1": {
          type: "SINGLE_SELECT",
          optionId: "opt-2",
          value: "Sales",
        },
      });
    });

    it("should accumulate MULTI_SELECT options correctly", async () => {
      mockAttributeToUserRepository.findManyIncludeAttribute.mockResolvedValue([
        {
          attributeOptionId: "opt-1",
          attributeOption: {
            value: "Skill A",
            attribute: {
              id: "attr-1",
              type: "MULTI_SELECT",
            },
          },
        },
        {
          attributeOptionId: "opt-1",
          attributeOption: {
            value: "Skill A",
            attribute: {
              id: "attr-1",
              type: "MULTI_SELECT",
            },
          },
        },
      ]);

      const result = await service.getUsersAttributesByOrgMembershipId({
        userId: 1,
        orgId: 100,
      });

      expect(result["attr-1"]).toEqual({
        type: "MULTI_SELECT",
        optionIds: new Set(["opt-1"]),
        values: new Set(["Skill A"]),
      });
    });
  });
});
