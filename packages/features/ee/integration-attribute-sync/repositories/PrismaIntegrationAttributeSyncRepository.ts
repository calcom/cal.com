import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import { IntegrationAttributeSyncOutputMapper } from "../mappers/IntegrationAttributeSyncOutputMapper";
import type {
  IIntegrationAttributeSyncCreateParams,
  IIntegrationAttributeSyncRepository,
  IIntegrationAttributeSyncUpdateParams,
} from "./IIntegrationAttributeSyncRepository";

export class PrismaIntegrationAttributeSyncRepository implements IIntegrationAttributeSyncRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async getByOrganizationId(organizationId: number) {
    const integrationAttributeSyncQuery = await this.prismaClient.integrationAttributeSync.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        name: true,
        organizationId: true,
        integration: true,
        credentialId: true,
        enabled: true,
        attributeSyncRule: true,
        syncFieldMappings: true,
      },
    });
    return IntegrationAttributeSyncOutputMapper.toDomainList(integrationAttributeSyncQuery);
  }

  async getById(id: string) {
    const integrationAttributeSyncQuery = await this.prismaClient.integrationAttributeSync.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        organizationId: true,
        integration: true,
        credentialId: true,
        enabled: true,
        attributeSyncRule: true,
        syncFieldMappings: true,
      },
    });

    if (!integrationAttributeSyncQuery) return null;

    return IntegrationAttributeSyncOutputMapper.toDomain(integrationAttributeSyncQuery);
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

  async getMappedAttributeIdsByOrganization(
    organizationId: number,
    excludeSyncId?: string
  ): Promise<string[]> {
    const result = await this.prismaClient.attributeSyncFieldMapping.findMany({
      where: {
        integrationAttributeSync: {
          organizationId,
          ...(excludeSyncId && { id: { not: excludeSyncId } }),
        },
      },
      select: {
        attributeId: true,
      },
      distinct: ["attributeId"],
    });

    return result.map((r) => r.attributeId);
  }

  async getAttributeIdsByOrganization(organizationId: number, attributeIds: string[]): Promise<string[]> {
    const result = await this.prismaClient.attribute.findMany({
      where: {
        id: { in: attributeIds },
        teamId: organizationId,
      },
      select: { id: true },
    });
    return result.map((r) => r.id);
  }

  async create(params: IIntegrationAttributeSyncCreateParams) {
    const { name, organizationId, integration, credentialId, enabled, rule, syncFieldMappings } = params;

    const created = await this.prismaClient.integrationAttributeSync.create({
      data: {
        name,
        organizationId,
        integration,
        credentialId,
        enabled,
        attributeSyncRule: {
          create: {
            rule: rule as unknown as Prisma.InputJsonValue,
          },
        },
        syncFieldMappings: {
          create: syncFieldMappings.map((mapping) => ({
            integrationFieldName: mapping.integrationFieldName,
            attributeId: mapping.attributeId,
            enabled: mapping.enabled,
          })),
        },
      },
      include: {
        attributeSyncRule: true,
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

    return IntegrationAttributeSyncOutputMapper.toDomain(created);
  }

  updateTransactionWithRuleAndMappings(params: IIntegrationAttributeSyncUpdateParams) {
    const {
      integrationAttributeSync,
      attributeSyncRule,
      fieldMappingsToCreate,
      fieldMappingsToUpdate,
      fieldMappingsToDelete,
    } = params;

    const { id: syncId, ...syncData } = integrationAttributeSync;

    return this.prismaClient
      .$transaction([
        this.prismaClient.integrationAttributeSync.update({
          where: {
            id: syncId,
          },
          data: syncData,
        }),
        this.prismaClient.attributeSyncRule.update({
          where: {
            id: attributeSyncRule.id,
          },
          data: {
            rule: attributeSyncRule.rule as unknown as Prisma.InputJsonValue,
          },
        }),
        ...fieldMappingsToUpdate.map(({ id, ...mappingData }) =>
          this.prismaClient.attributeSyncFieldMapping.update({
            where: {
              id,
            },
            data: mappingData,
          })
        ),
        ...(fieldMappingsToCreate.length > 0
          ? [
              this.prismaClient.attributeSyncFieldMapping.createMany({
                data: fieldMappingsToCreate.map((mapping) => ({
                  ...mapping,
                  integrationAttributeSyncId: syncId,
                })),
              }),
            ]
          : []),
        ...(fieldMappingsToDelete.length > 0
          ? [
              this.prismaClient.attributeSyncFieldMapping.deleteMany({
                where: { id: { in: fieldMappingsToDelete } },
              }),
            ]
          : []),
      ])
      .then(() => {});
  }

  deleteById(id: string) {
    return this.prismaClient.integrationAttributeSync
      .delete({
        where: {
          id,
        },
      })
      .then(() => {});
  }

  async getAllByCredentialId(credentialId: number) {
    const integrationAttributeSyncsQuery = await this.prismaClient.integrationAttributeSync.findMany({
      where: {
        credentialId,
      },
      select: {
        id: true,
        name: true,
        organizationId: true,
        integration: true,
        credentialId: true,
        enabled: true,
        attributeSyncRule: true,
        syncFieldMappings: true,
      },
    });

    return IntegrationAttributeSyncOutputMapper.toDomainList(integrationAttributeSyncsQuery);
  }
}
