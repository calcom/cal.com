import { describe, it, expect } from "vitest";

import type { AttributeSyncRule as PrismaAttributeSyncRule } from "@calcom/prisma/client";

import { AttributeSyncUserRuleOutputMapper } from "./AttributeSyncUserRuleOutputMapper";

describe("AttributeSyncUserRuleOutputMapper", () => {
  describe("toDomain", () => {
    it("should convert a Prisma AttributeSyncRule with team conditions to domain model", () => {
      const prismaRule: PrismaAttributeSyncRule = {
        id: "rule-123",
        integrationAttributeSyncId: "sync-456",
        rule: {
          operator: "AND",
          conditions: [
            {
              identifier: "teamId",
              operator: "equals",
              value: [1, 2, 3],
            },
          ],
        },
      };

      const result = AttributeSyncUserRuleOutputMapper.toDomain(prismaRule);

      expect(result).toEqual({
        id: "rule-123",
        integrationAttributeSyncId: "sync-456",
        rule: {
          operator: "AND",
          conditions: [
            {
              identifier: "teamId",
              operator: "equals",
              value: [1, 2, 3],
            },
          ],
        },
      });
    });

    it("should convert a Prisma AttributeSyncRule with attribute conditions to domain model", () => {
      const prismaRule: PrismaAttributeSyncRule = {
        id: "rule-456",
        integrationAttributeSyncId: "sync-789",
        rule: {
          operator: "OR",
          conditions: [
            {
              identifier: "attributeId",
              attributeId: "attr-123",
              operator: "in",
              value: ["option-1", "option-2"],
            },
          ],
        },
      };

      const result = AttributeSyncUserRuleOutputMapper.toDomain(prismaRule);

      expect(result).toEqual({
        id: "rule-456",
        integrationAttributeSyncId: "sync-789",
        rule: {
          operator: "OR",
          conditions: [
            {
              identifier: "attributeId",
              attributeId: "attr-123",
              operator: "in",
              value: ["option-1", "option-2"],
            },
          ],
        },
      });
    });

    it("should handle mixed team and attribute conditions", () => {
      const prismaRule: PrismaAttributeSyncRule = {
        id: "rule-mixed",
        integrationAttributeSyncId: "sync-mixed",
        rule: {
          operator: "AND",
          conditions: [
            {
              identifier: "teamId",
              operator: "notEquals",
              value: [5],
            },
            {
              identifier: "attributeId",
              attributeId: "attr-456",
              operator: "notIn",
              value: ["option-x"],
            },
          ],
        },
      };

      const result = AttributeSyncUserRuleOutputMapper.toDomain(prismaRule);

      expect(result).toEqual({
        id: "rule-mixed",
        integrationAttributeSyncId: "sync-mixed",
        rule: {
          operator: "AND",
          conditions: [
            {
              identifier: "teamId",
              operator: "notEquals",
              value: [5],
            },
            {
              identifier: "attributeId",
              attributeId: "attr-456",
              operator: "notIn",
              value: ["option-x"],
            },
          ],
        },
      });
    });

    it("should handle empty conditions array", () => {
      const prismaRule: PrismaAttributeSyncRule = {
        id: "rule-empty",
        integrationAttributeSyncId: "sync-empty",
        rule: {
          operator: "AND",
          conditions: [],
        },
      };

      const result = AttributeSyncUserRuleOutputMapper.toDomain(prismaRule);

      expect(result).toEqual({
        id: "rule-empty",
        integrationAttributeSyncId: "sync-empty",
        rule: {
          operator: "AND",
          conditions: [],
        },
      });
    });
  });

  describe("toDomainList", () => {
    it("should convert an array of Prisma AttributeSyncRules to domain models", () => {
      const prismaRules: PrismaAttributeSyncRule[] = [
        {
          id: "rule-1",
          integrationAttributeSyncId: "sync-1",
          rule: {
            operator: "AND",
            conditions: [
              {
                identifier: "teamId",
                operator: "equals",
                value: [1],
              },
            ],
          },
        },
        {
          id: "rule-2",
          integrationAttributeSyncId: "sync-2",
          rule: {
            operator: "OR",
            conditions: [
              {
                identifier: "attributeId",
                attributeId: "attr-1",
                operator: "in",
                value: ["opt-1"],
              },
            ],
          },
        },
      ];

      const result = AttributeSyncUserRuleOutputMapper.toDomainList(prismaRules);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "rule-1",
        integrationAttributeSyncId: "sync-1",
        rule: {
          operator: "AND",
          conditions: [
            {
              identifier: "teamId",
              operator: "equals",
              value: [1],
            },
          ],
        },
      });
      expect(result[1]).toEqual({
        id: "rule-2",
        integrationAttributeSyncId: "sync-2",
        rule: {
          operator: "OR",
          conditions: [
            {
              identifier: "attributeId",
              attributeId: "attr-1",
              operator: "in",
              value: ["opt-1"],
            },
          ],
        },
      });
    });

    it("should return empty array for empty input", () => {
      const result = AttributeSyncUserRuleOutputMapper.toDomainList([]);

      expect(result).toEqual([]);
    });
  });
});
