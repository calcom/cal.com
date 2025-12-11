import type { PrismaClient } from "@calcom/prisma";

import { AttributeSyncUserRuleOutputMapper } from "../mappers/AttributeSyncUserRuleOutputMapper";
import type { IIntegrationAttributeSyncRepository } from "./IIntegrationAttributeSyncRepository";

export class PrismaIntegrationAttributeSyncRepository implements IIntegrationAttributeSyncRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async getByOrganizationId(organizationId: number) {
    const integrationAttributeSyncQuery = await this.prismaClient.integrationAttributeSync.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        organizationId: true,
        credentialId: true,
        enabled: true,
        attributeSyncRules: true,
        syncFieldMappings: true,
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

  async getById(id: string) {
    const integrationAttributeSyncQuery = await this.prismaClient.integrationAttributeSync.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        organizationId: true,
        credentialId: true,
        enabled: true,
        attributeSyncRules: true,
        syncFieldMappings: true,
      },
    });

    if (!integrationAttributeSyncQuery) return null;

    return {
      ...integrationAttributeSyncQuery,
      attributeSyncRules: AttributeSyncUserRuleOutputMapper.toDomainList(
        integrationAttributeSyncQuery.attributeSyncRules
      ),
    };
  }

  async getSyncFieldMappings(integrationAttributeSyncId: string) {
    const result = await this.prismaClient.integrationAttributeSync.findUnique({
      where: {
        id: integrationAttributeSyncId,
      },
      select: {
        syncFieldMappings: {
          select: {
            id: true,
            integrationFieldName: true,
            attributeId: true,
            enabled: true,
          },
        },
      },
    });

    return result?.syncFieldMappings || [];
  }

  // async updateTransactionWithRuleAndMappings(params: IIntegrationAttributeSyncUpdateParams) {
  //   const { integrationAttributeSync, attributeSyncRule, syncFieldMappings } = params;
  // }
}
