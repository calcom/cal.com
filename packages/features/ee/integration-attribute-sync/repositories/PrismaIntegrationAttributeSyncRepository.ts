import type { PrismaClient } from "@calcom/prisma";

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
            rule,
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

    return this.prismaClient
      .$transaction([
        this.prismaClient.integrationAttributeSync.update({
          where: {
            id: integrationAttributeSync.id,
          },
          data: {
            ...integrationAttributeSync,
          },
        }),
        this.prismaClient.attributeSyncRule.update({
          where: {
            id: attributeSyncRule.id,
          },
          data: {
            ...attributeSyncRule,
          },
        }),
        ...fieldMappingsToUpdate.map((mapping) =>
          this.prismaClient.attributeSyncFieldMapping.update({
            where: {
              id: mapping.id,
            },
            data: {
              ...mapping,
            },
          })
        ),
        ...(fieldMappingsToCreate.length > 0
          ? [
              this.prismaClient.attributeSyncFieldMapping.createMany({
                data: fieldMappingsToCreate.map((mapping) => ({
                  ...mapping,
                  integrationAttributeSyncId: integrationAttributeSync.id,
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
}
