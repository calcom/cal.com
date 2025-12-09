import type { PrismaClient } from "@calcom/prisma";

import type { IIntegrationAttributeSyncRepository } from "./IIntegrationAttributeSyncRepository";
import { AttributeSyncUserRuleOutputMapper } from "../mappers/AttributeSyncUserRuleOutputMapper";

export class PrismaIntegrationAttributeSyncRepository implements IIntegrationAttributeSyncRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async getIntegrationAttributeSyncs(organizationId: number) {
    const integrationAttributeSyncQuery = await this.prismaClient.integrationAttributeSync.findMany({
      where: {
        organizationId,
      },
      include: {
        attributeSyncRules: {
          include: {
            syncFieldMappings: true,
          },
        },
      },
    });
    return integrationAttributeSyncQuery.map((integrationAttributeSync) => {
      return {
        ...integrationAttributeSync,
        attributeSyncRules: AttributeSyncUserRuleOutputMapper.toDomainList(
          integrationAttributeSync.attributeSyncRules
        ),
      };
    });
  }
}
