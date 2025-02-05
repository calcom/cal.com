import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  handleSimpleAttribute,
  handleSelectAttribute,
  processUserAttributes,
  removeAttribute,
} from "./attributeUtils";

describe("Attribute Utils", () => {
  const mockTx = {
    membership: {
      findFirst: vi.fn(),
    },
    attributeToUser: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    attributeOption: {
      update: vi.fn(),
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processUserAttributes", () => {
    it("should return error if user is not a member", async () => {
      mockTx.membership.findFirst.mockResolvedValue(null);

      const result = await processUserAttributes(mockTx as any, 1, 1, []);

      expect(result).toEqual({
        userId: 1,
        success: false,
        message: "User is not part of your organization",
      });
    });

    it("should skip attributes without type", async () => {
      mockTx.membership.findFirst.mockResolvedValue({ id: 1 });

      const result = await processUserAttributes(mockTx as any, 1, 1, [{ id: "attr-1", value: "test" }]);

      expect(result).toEqual({
        userId: 1,
        success: true,
      });
      expect(mockTx.attributeToUser.findFirst).not.toHaveBeenCalled();
    });

    it("should process TEXT attribute", async () => {
      mockTx.membership.findFirst.mockResolvedValue({ id: 1 });

      const result = await processUserAttributes(mockTx as any, 1, 1, [
        { id: "attr-1", value: "test", type: "TEXT" },
      ]);

      expect(result).toEqual({
        userId: 1,
        success: true,
      });
      expect(mockTx.attributeToUser.findFirst).toHaveBeenCalled();
    });

    it("should process NUMBER attribute", async () => {
      mockTx.membership.findFirst.mockResolvedValue({ id: 1 });

      const result = await processUserAttributes(mockTx as any, 1, 1, [
        { id: "attr-1", value: "123", type: "NUMBER" },
      ]);

      expect(result).toEqual({
        userId: 1,
        success: true,
      });
      expect(mockTx.attributeToUser.findFirst).toHaveBeenCalled();
    });

    it("should process SINGLE_SELECT attribute", async () => {
      mockTx.membership.findFirst.mockResolvedValue({ id: 1 });

      const result = await processUserAttributes(mockTx as any, 1, 1, [
        { id: "attr-1", options: [{ value: "opt-1" }], type: "SINGLE_SELECT" },
      ]);

      expect(result).toEqual({
        userId: 1,
        success: true,
      });
      // Should first delete existing options
      expect(mockTx.attributeToUser.deleteMany).toHaveBeenCalledWith({
        where: {
          memberId: 1,
          attributeOption: {
            attribute: {
              id: "attr-1",
            },
          },
        },
      });
      // Then add the new option
      expect(mockTx.attributeToUser.upsert).toHaveBeenCalledWith({
        where: {
          memberId_attributeOptionId: {
            memberId: 1,
            attributeOptionId: "opt-1",
          },
        },
        create: {
          memberId: 1,
          attributeOptionId: "opt-1",
        },
        update: {},
      });
    });

    it("should process MULTI_SELECT attribute", async () => {
      mockTx.membership.findFirst.mockResolvedValue({ id: 1 });

      const result = await processUserAttributes(mockTx as any, 1, 1, [
        {
          id: "attr-1",
          options: [{ value: "opt-1" }, { value: "opt-2" }],
          type: "MULTI_SELECT",
        },
      ]);

      expect(result).toEqual({
        userId: 1,
        success: true,
      });
      // Should not delete existing options for multi-select
      expect(mockTx.attributeToUser.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.attributeToUser.upsert).toHaveBeenCalledTimes(2);
    });

    it("should handle attribute removal when no value or options provided", async () => {
      mockTx.membership.findFirst.mockResolvedValue({ id: 1 });

      const result = await processUserAttributes(mockTx as any, 1, 1, [{ id: "attr-1", type: "TEXT" }]);

      expect(result).toEqual({
        userId: 1,
        success: true,
      });
      expect(mockTx.attributeToUser.deleteMany).toHaveBeenCalled();
    });
  });

  describe("handleSimpleAttribute", () => {
    it("should update existing attribute option", async () => {
      mockTx.attributeToUser.findFirst.mockResolvedValue({
        id: 1,
        attributeOption: { id: 2 },
      });

      await handleSimpleAttribute(mockTx as any, 1, {
        id: "attr-1",
        value: "test value",
      });

      expect(mockTx.attributeOption.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: {
          value: "test value",
          slug: "test-value",
        },
      });
    });

    it("should create new attribute option if none exists", async () => {
      mockTx.attributeToUser.findFirst.mockResolvedValue(null);

      await handleSimpleAttribute(mockTx as any, 1, {
        id: "attr-1",
        value: "new value",
      });

      expect(mockTx.attributeOption.create).toHaveBeenCalledWith({
        data: {
          value: "new value",
          slug: "new-value",
          attribute: {
            connect: { id: "attr-1" },
          },
          assignedUsers: {
            create: { memberId: 1 },
          },
        },
      });
    });
  });

  describe("handleSelectAttribute", () => {
    it("should remove existing options for SINGLE_SELECT before adding new one", async () => {
      await handleSelectAttribute(mockTx as any, 1, {
        id: "attr-1",
        options: [{ value: "opt-1" }],
        type: "SINGLE_SELECT",
      });

      expect(mockTx.attributeToUser.deleteMany).toHaveBeenCalledWith({
        where: {
          memberId: 1,
          attributeOption: {
            attribute: {
              id: "attr-1",
            },
          },
        },
      });
      expect(mockTx.attributeToUser.upsert).toHaveBeenCalledWith({
        where: {
          memberId_attributeOptionId: {
            memberId: 1,
            attributeOptionId: "opt-1",
          },
        },
        create: {
          memberId: 1,
          attributeOptionId: "opt-1",
        },
        update: {},
      });
    });

    it("should not remove existing options for MULTI_SELECT", async () => {
      await handleSelectAttribute(mockTx as any, 1, {
        id: "attr-1",
        options: [{ value: "opt-1" }, { value: "opt-2" }],
        type: "MULTI_SELECT",
      });

      expect(mockTx.attributeToUser.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.attributeToUser.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe("removeAttribute", () => {
    it("should delete all attribute options for user", async () => {
      await removeAttribute(mockTx as any, 1, "attr-1");

      expect(mockTx.attributeToUser.deleteMany).toHaveBeenCalledWith({
        where: {
          memberId: 1,
          attributeOption: {
            attribute: {
              id: "attr-1",
            },
          },
        },
      });
    });
  });
});
