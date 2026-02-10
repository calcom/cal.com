import type {
  AttributeSyncRule as PrismaAttributeSyncRule,
  IntegrationAttributeSync as PrismaIntegrationAttributeSync,
  AttributeSyncFieldMapping as PrismaAttributeSyncFieldMapping,
} from "@calcom/prisma/client";

import type {
  AttributeSyncRule,
  IntegrationAttributeSync,
} from "../repositories/IIntegrationAttributeSyncRepository";
import { AttributeSyncIntegrations } from "../repositories/IIntegrationAttributeSyncRepository";
import { attributeSyncRuleSchema } from "../schemas/zod";

type PrismaIntegrationAttributeSyncWithRelations = Pick<
  PrismaIntegrationAttributeSync,
  "id" | "name" | "organizationId" | "integration" | "credentialId" | "enabled"
> & {
  attributeSyncRule: PrismaAttributeSyncRule | null;
  syncFieldMappings: Pick<
    PrismaAttributeSyncFieldMapping,
    "id" | "integrationFieldName" | "attributeId" | "enabled"
  >[];
};

export class IntegrationAttributeSyncOutputMapper {
  static attributeSyncRuleToDomain(prisma: PrismaAttributeSyncRule): AttributeSyncRule {
    const parsedRules = attributeSyncRuleSchema.parse(prisma.rule);

    return {
      ...prisma,
      rule: parsedRules,
    };
  }

  static toDomain(prisma: PrismaIntegrationAttributeSyncWithRelations): IntegrationAttributeSync {
    return {
      id: prisma.id,
      name: prisma.name,
      organizationId: prisma.organizationId,
      integration: prisma.integration as AttributeSyncIntegrations,
      credentialId: prisma.credentialId ?? undefined,
      enabled: prisma.enabled,
      attributeSyncRule: prisma.attributeSyncRule
        ? IntegrationAttributeSyncOutputMapper.attributeSyncRuleToDomain(prisma.attributeSyncRule)
        : null,
      syncFieldMappings: prisma.syncFieldMappings,
    };
  }

  static toDomainList(prismaList: PrismaIntegrationAttributeSyncWithRelations[]): IntegrationAttributeSync[] {
    return prismaList.map(IntegrationAttributeSyncOutputMapper.toDomain);
  }
}
