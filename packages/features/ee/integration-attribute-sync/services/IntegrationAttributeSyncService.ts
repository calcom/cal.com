import type { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";

import { enabledAppSlugs } from "../constants";
import type { IIntegrationAttributeSyncRepository } from "../repositories/IIntegrationAttributeSyncRepository";
import type { ISyncFormData } from "../schemas/zod";

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
    const { _syncFieldMappings, _rule, ..._integrationAttributeSync } = data;
    // Get existing mappings to determine what to delete
    const existingMappings = await this.deps.integrationAttributeSyncRepository.getSyncFieldMappings(data.id);

    // Determine which mappings to delete
    const existingMappingIds = new Set(existingMappings.map((m) => m.id));
    const incomingMappingIds = new Set(data.syncFieldMappings.filter((m) => m.id).map((m) => m.id!));

    const toDelete = Array.from(existingMappingIds).filter((id) => !incomingMappingIds.has(id));

    // Mappings without IDs are new, mappings with IDs need to be updated
    const toCreate = data.syncFieldMappings.filter((m) => !m.id);
    const toUpdate = data.syncFieldMappings.filter((m) => m.id);

    // TODO: Implement the actual update call to the repository
    console.log({ toDelete, toCreate, toUpdate });
  }
}
