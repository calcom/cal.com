import type { AttributeSyncUserRule as PrismaAttributeSyncUserRule } from "@calcom/prisma/client";

import type { AttributeSyncUserRule } from "../repositories/IIntegrationAttributeSyncRepository";
import { attributeSyncRuleSchema } from "../schemas/zod";

export class AttributeSyncUserRuleOutputMapper {
  static toDomain(prisma: PrismaAttributeSyncUserRule): Omit<AttributeSyncUserRule, "syncFieldMappings"> {
    // Parse and validate the JSON field with Zod
    const parsedRules = attributeSyncRuleSchema.parse(prisma.rule);

    return {
      ...prisma,
      rule: parsedRules,
    };
  }

  static toDomainList(
    prismaList: PrismaAttributeSyncUserRule[]
  ): Omit<AttributeSyncUserRule, "syncFieldMappings">[] {
    return prismaList.map(AttributeSyncUserRuleOutputMapper.toDomain);
  }
}
