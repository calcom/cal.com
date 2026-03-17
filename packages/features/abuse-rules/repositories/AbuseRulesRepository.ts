import type { PrismaClient } from "@calcom/prisma";
import { AbuseRuleAuditAction } from "@calcom/prisma/enums";

export type AbuseRuleConditionSummary = {
  field: string;
  operator: string;
  value: string;
};

export type AbuseRuleListItem = {
  id: string;
  matchAll: boolean;
  weight: number;
  autoLock: boolean;
  enabled: boolean;
  description: string | null;
  createdAt: Date;
  conditions: AbuseRuleConditionSummary[];
};

export type AbuseRuleConditionInput = {
  field: string;
  operator: string;
  value: string;
};

export type AbuseRuleDetail = {
  id: string;
  matchAll: boolean;
  weight: number;
  autoLock: boolean;
  enabled: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: number | null;
  updatedById: number | null;
  conditions: Array<{ id: string; field: string; operator: string; value: string }>;
};

export type AbuseRuleAuditEntry = {
  id: string;
  action: string;
  createdById: number | null;
  details: string | null;
  createdAt: Date;
};

const DETAIL_SELECT = {
  id: true,
  matchAll: true,
  weight: true,
  autoLock: true,
  enabled: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  updatedById: true,
  conditions: {
    select: { id: true, field: true, operator: true, value: true },
  },
} as const;

export class AbuseRulesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findPaginated(limit: number, offset: number): Promise<{ rows: AbuseRuleListItem[]; totalRowCount: number }> {
    const [rows, totalRowCount] = await Promise.all([
      this.prisma.abuseRuleGroup.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          matchAll: true,
          weight: true,
          autoLock: true,
          enabled: true,
          description: true,
          createdAt: true,
          conditions: {
            select: { field: true, operator: true, value: true },
          },
        },
      }),
      this.prisma.abuseRuleGroup.count(),
    ]);

    return { rows, totalRowCount };
  }

  async findByIdIncludeConditions(id: string): Promise<AbuseRuleDetail> {
    return this.prisma.abuseRuleGroup.findUniqueOrThrow({
      where: { id },
      select: DETAIL_SELECT,
    });
  }

  async findAuditLog(ruleGroupId: string, limit = 20): Promise<AbuseRuleAuditEntry[]> {
    return this.prisma.abuseRuleAudit.findMany({
      where: { ruleGroupId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        action: true,
        createdById: true,
        details: true,
        createdAt: true,
      },
    });
  }

  async create(
    data: {
      matchAll: boolean;
      weight: number;
      autoLock: boolean;
      enabled: boolean;
      description?: string;
      conditions: AbuseRuleConditionInput[];
    },
    userId: number
  ): Promise<AbuseRuleDetail> {
    const { conditions, ...ruleData } = data;

    return this.prisma.$transaction(async (tx) => {
      const rule = await tx.abuseRuleGroup.create({
        data: {
          ...ruleData,
          createdById: userId,
          updatedById: userId,
          conditions: {
            createMany: {
              data: conditions.map((c) => ({
                field: c.field,
                operator: c.operator,
                value: c.value,
              })),
            },
          },
        },
        select: DETAIL_SELECT,
      });

      await tx.abuseRuleAudit.create({
        data: {
          ruleGroupId: rule.id,
          action: AbuseRuleAuditAction.CREATED,
          createdById: userId,
          details: `weight: ${rule.weight}, autoLock: ${rule.autoLock}, conditions: ${conditions.length}`,
        },
      });

      return rule;
    });
  }

  async update(
    id: string,
    data: {
      matchAll?: boolean;
      weight?: number;
      autoLock?: boolean;
      enabled?: boolean;
      description?: string | null;
      conditions?: AbuseRuleConditionInput[];
    },
    userId: number
  ): Promise<AbuseRuleDetail> {
    const { conditions, ...ruleData } = data;

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.abuseRuleGroup.findUniqueOrThrow({
        where: { id },
        select: { weight: true, autoLock: true, enabled: true, matchAll: true, description: true },
      });

      if (conditions) {
        await tx.abuseRuleCondition.deleteMany({ where: { groupId: id } });
        await tx.abuseRuleCondition.createMany({
          data: conditions.map((c) => ({
            groupId: id,
            field: c.field,
            operator: c.operator,
            value: c.value,
          })),
        });
      }

      const rule = await tx.abuseRuleGroup.update({
        where: { id },
        data: { ...ruleData, updatedById: userId },
        select: DETAIL_SELECT,
      });

      const tracked = ["weight", "autoLock", "enabled", "matchAll"] as const;
      const changes = tracked
        .filter((key) => data[key] !== undefined && data[key] !== before[key])
        .map((key) => `${key}: ${before[key]}→${data[key]}`);
      if (conditions) changes.push(`conditions replaced (${conditions.length})`);

      await tx.abuseRuleAudit.create({
        data: {
          ruleGroupId: id,
          action: AbuseRuleAuditAction.UPDATED,
          createdById: userId,
          details: changes.join(", ") || "no field changes",
        },
      });

      return rule;
    });
  }

  async delete(id: string, userId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.abuseRuleGroup.delete({ where: { id } });
      await tx.abuseRuleAudit.create({
        data: {
          ruleGroupId: id,
          action: AbuseRuleAuditAction.DELETED,
          createdById: userId,
        },
      });
    });
  }

  async deleteMany(ids: string[], userId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.abuseRuleGroup.deleteMany({ where: { id: { in: ids } } });
      await tx.abuseRuleAudit.createMany({
        data: ids.map((ruleId) => ({
          ruleGroupId: ruleId,
          action: AbuseRuleAuditAction.DELETED,
          createdById: userId,
        })),
      });
    });
  }
}
