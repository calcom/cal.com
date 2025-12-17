import type { AttributeSyncRule as PrismaAttributeSyncRule } from "@calcom/prisma/client";

import type { AttributeSyncRule } from "../repositories/IIntegrationAttributeSyncRepository";
import { attributeSyncRuleSchema } from "../schemas/zod";

export class AttributeSyncUserRuleOutputMapper {
  static toDomain(prisma: PrismaAttributeSyncRule): Omit<AttributeSyncRule, "syncFieldMappings"> {
    // Parse and validate the JSON field with Zod
    const parsedRules = attributeSyncRuleSchema.parse(prisma.rule);

    return {
      ...prisma,
      rule: parsedRules,
    };
  }

  static toDomainList(prismaList: PrismaAttributeSyncRule[]): Omit<AttributeSyncRule, "syncFieldMappings">[] {
    return prismaList.map(AttributeSyncUserRuleOutputMapper.toDomain);
  }
}
