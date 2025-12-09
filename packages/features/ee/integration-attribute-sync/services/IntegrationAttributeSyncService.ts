import type { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";

import { enabledAppSlugs } from "../constants";
import type { IIntegrationAttributeSyncRepository } from "../repositories/IIntegrationAttributeSyncRepository";

interface IIntegrationAttributeSyncServiceDeps {
  credentialRepository: CredentialRepository;
  integrationAttributeSyncRepository: IIntegrationAttributeSyncRepository;
}

export class IntegrationAttributeSyncService {
  constructor(private readonly deps: IIntegrationAttributeSyncServiceDeps) {}

  async getEnabledAppCredentials({ organizationId }: { organizationId: number }) {
    return this.deps.credentialRepository.findByTeamIdAndSlugs({
      teamId: organizationId,
      slugs: enabledAppSlugs,
    });
  }

  async getAllAttributeSyncs(organizationId: number) {
    return this.deps.integrationAttributeSyncRepository.getIntegrationAttributeSyncs(organizationId);
  }
}
