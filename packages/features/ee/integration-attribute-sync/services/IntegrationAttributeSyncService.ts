import type { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";

import type { ZCreateAttributeSyncSchema } from "@calcom/trpc/server/routers/viewer/attribute-sync/createAttributeSync.schema";
import { enabledAppSlugs } from "../constants";
import type { IIntegrationAttributeSyncRepository } from "../repositories/IIntegrationAttributeSyncRepository";
import { type ISyncFormData, attributeSyncRuleSchema } from "../schemas/zod";

interface IIntegrationAttributeSyncServiceDeps {
  credentialRepository: CredentialRepository;
  integrationAttributeSyncRepository: IIntegrationAttributeSyncRepository;
}

export class IntegrationAttributeSyncService {
  constructor(private readonly deps: IIntegrationAttributeSyncServiceDeps) {}

  async getEnabledAppCredentials(organizationId: number) {
    return this.deps.credentialRepository.findByTeamIdAndSlugs({
      teamId: organizationId,
      slugs: enabledAppSlugs,
    });
  }

  async getAllIntegrationAttributeSyncs(organizationId: number) {
    return this.deps.integrationAttributeSyncRepository.getByOrganizationId(organizationId);
  }

  async getById(id: string) {
    return this.deps.integrationAttributeSyncRepository.getById(id);
  }

  async createAttributeSync(input: ZCreateAttributeSyncSchema, organizationId: number) {
    const credential = await this.deps.credentialRepository.findByIdAndTeamId({
      id: input.credentialId,
      teamId: organizationId,
    });

    if (!credential) {
      throw new Error("Credential not found");
    }

    const parsedRule = attributeSyncRuleSchema.parse(input.rule);

    return this.deps.integrationAttributeSyncRepository.create({
      name: input.name,
      organizationId,
      integration: credential.app?.slug || credential.type,
      credentialId: input.credentialId,
      enabled: input.enabled,
      rule: parsedRule,
      syncFieldMappings: input.syncFieldMappings,
    });
  }

  async updateIncludeRulesAndMappings(data: ISyncFormData) {
    const { syncFieldMappings, rule, ruleId, ...integrationAttributeSync } = data;
    const existingFieldMappings = await this.deps.integrationAttributeSyncRepository.getSyncFieldMappings(
      data.id
    );

    const parsedRule = attributeSyncRuleSchema.parse(rule);

    const incomingMappingIds = new Set(
      syncFieldMappings.reduce((ids, mapping) => {
        if ("id" in mapping) ids.push(mapping.id);
        return ids;
      }, [] as string[])
    );

    const fieldMappingsToDelete = existingFieldMappings
      .filter((mapping) => !incomingMappingIds.has(mapping.id))
      .map((mapping) => mapping.id);

    const fieldMappingsToCreate = syncFieldMappings.filter((m) => !("id" in m));
    const fieldMappingsToUpdate = syncFieldMappings.filter((m): m is typeof m & { id: string } => "id" in m);

    await this.deps.integrationAttributeSyncRepository.updateTransactionWithRuleAndMappings({
      integrationAttributeSync,
      attributeSyncRule: {
        id: ruleId,
        rule: parsedRule,
      },
      fieldMappingsToCreate,
      fieldMappingsToUpdate,
      fieldMappingsToDelete,
    });
  }
  async deleteById(id: string) {
    return this.deps.integrationAttributeSyncRepository.deleteById(id);
  }
}
