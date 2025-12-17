import type { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";

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

  async updateIncludeRulesAndMappings(data: ISyncFormData) {
    const { syncFieldMappings, rule, ruleId, ...integrationAttributeSync } = data;
    // Get existing mappings to determine what to delete
    const existingFieldMappings = await this.deps.integrationAttributeSyncRepository.getSyncFieldMappings(
      data.id
    );

    const parsedRule = attributeSyncRuleSchema.parse(rule);

    // Determine which mappings to delete
    const existingMappingIds = new Set(existingFieldMappings.map((m) => m.id));
    const incomingMappingIds = new Set(syncFieldMappings.filter((m) => m.id).map((m) => m.id!));

    const fieldMappingsToDelete = Array.from(existingMappingIds).filter((id) => !incomingMappingIds.has(id));

    // Mappings without IDs are new, mappings with IDs need to be updated
    const fieldMappingsToCreate = syncFieldMappings.filter((m) => !m.id);
    const fieldMappingsToUpdate = syncFieldMappings.filter((m) => m.id);

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
