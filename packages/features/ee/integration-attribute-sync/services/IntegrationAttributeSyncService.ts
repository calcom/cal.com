import type { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import type { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import type { ZCreateAttributeSyncSchema } from "@calcom/trpc/server/routers/viewer/attribute-sync/createAttributeSync.schema";

import { enabledAppSlugs } from "../constants";
import {
  type IIntegrationAttributeSyncRepository,
  type ISyncFormData,
  type ITeamCondition,
  type IAttributeSyncRule,
  AttributeSyncIntegrations,
  ConditionIdentifierEnum,
} from "../repositories/IIntegrationAttributeSyncRepository";
import { attributeSyncRuleSchema } from "../schemas/zod";

interface IIntegrationAttributeSyncServiceDeps {
  credentialRepository: CredentialRepository;
  integrationAttributeSyncRepository: IIntegrationAttributeSyncRepository;
  teamRepository: TeamRepository;
}

export class IntegrationAttributeSyncService {
  constructor(private readonly deps: IIntegrationAttributeSyncServiceDeps) {}

  private extractTeamIdsFromRule(rule: IAttributeSyncRule): number[] {
    return rule.conditions
      .filter((c): c is ITeamCondition => c.identifier === ConditionIdentifierEnum.TEAM_ID)
      .flatMap((c) => c.value);
  }

  private async validateTeamsBelongToOrg(teamIds: number[], organizationId: number): Promise<void> {
    if (teamIds.length === 0) return;

    const invalidTeams = await this.deps.teamRepository.findTeamsNotBelongingToOrgByIds({
      teamIds,
      orgId: organizationId,
    });

    if (invalidTeams.length > 0) {
      throw new Error(`Teams do not belong to this organization: ${invalidTeams.map((t) => t.id).join(", ")}`);
    }
  }

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

    const teamIds = this.extractTeamIdsFromRule(parsedRule);
    await this.validateTeamsBelongToOrg(teamIds, organizationId);

    const integrationValue = credential.app?.slug || credential.type;
    if (!Object.values(AttributeSyncIntegrations).includes(integrationValue as AttributeSyncIntegrations)) {
      throw new Error(`Unsupported integration type: ${integrationValue}`);
    }

    return this.deps.integrationAttributeSyncRepository.create({
      name: input.name,
      organizationId,
      integration: integrationValue as AttributeSyncIntegrations,
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

    const teamIds = this.extractTeamIdsFromRule(parsedRule);
    await this.validateTeamsBelongToOrg(teamIds, data.organizationId);

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

  async getAllByCredentialId(credentialId: number) {
    return this.deps.integrationAttributeSyncRepository.getAllByCredentialId(credentialId);
  }
}
