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

export class DuplicateAttributeWithinSyncError extends Error {
  constructor(public attributeId: string) {
    super("Attribute is already mapped in this sync");
    this.name = "DuplicateAttributeWithinSyncError";
  }
}

export class DuplicateAttributeAcrossSyncsError extends Error {
  constructor(public attributeId: string) {
    super("Attribute is already mapped in another sync");
    this.name = "DuplicateAttributeAcrossSyncsError";
  }
}

export class UnauthorizedAttributeError extends Error {
  constructor(public attributeIds: string[]) {
    super("One or more attributes do not belong to this organization");
    this.name = "UnauthorizedAttributeError";
  }
}

export class CredentialNotFoundError extends Error {
  constructor() {
    super("Credential not found");
    this.name = "CredentialNotFoundError";
  }
}

interface IIntegrationAttributeSyncServiceDeps {
  credentialRepository: CredentialRepository;
  integrationAttributeSyncRepository: IIntegrationAttributeSyncRepository;
  teamRepository: TeamRepository;
}

export class IntegrationAttributeSyncService {
  constructor(private readonly deps: IIntegrationAttributeSyncServiceDeps) {}

  private extractTeamIdsFromRule(rule: IAttributeSyncRule): number[] {
    return rule.conditions
      .filter(
        (c): c is ITeamCondition =>
          c.identifier === ConditionIdentifierEnum.TEAM_ID
      )
      .flatMap((c) => c.value);
  }

  private async validateTeamsBelongToOrg(
    teamIds: number[],
    organizationId: number
  ): Promise<void> {
    if (teamIds.length === 0) return;

    const invalidTeams =
      await this.deps.teamRepository.findTeamsNotBelongingToOrgByIds({
        teamIds,
        orgId: organizationId,
      });

    if (invalidTeams.length > 0) {
      throw new Error(
        `Teams do not belong to this organization: ${invalidTeams
          .map((t) => t.id)
          .join(", ")}`
      );
    }
  }

  private validateWithinSyncUniqueness(
    mappings: { attributeId: string }[]
  ): void {
    const seenAttributes = new Set<string>();
    for (const mapping of mappings) {
      if (seenAttributes.has(mapping.attributeId)) {
        throw new DuplicateAttributeWithinSyncError(mapping.attributeId);
      }
      seenAttributes.add(mapping.attributeId);
    }
  }

  private async validateCrossSyncUniqueness(
    organizationId: number,
    mappings: { attributeId: string }[],
    excludeSyncId?: string
  ): Promise<void> {
    const existingMappedIds =
      await this.deps.integrationAttributeSyncRepository.getMappedAttributeIdsByOrganization(
        organizationId,
        excludeSyncId
      );
    const existingSet = new Set(existingMappedIds);

    for (const mapping of mappings) {
      if (existingSet.has(mapping.attributeId)) {
        throw new DuplicateAttributeAcrossSyncsError(mapping.attributeId);
      }
    }
  }

  private async validateAttributeOwnership(
    organizationId: number,
    attributeIds: string[]
  ): Promise<void> {
    const validAttributeIds =
      await this.deps.integrationAttributeSyncRepository.getAttributeIdsByOrganization(
        organizationId,
        attributeIds
      );

    if (validAttributeIds.length !== attributeIds.length) {
      const validSet = new Set(validAttributeIds);
      const invalidIds = attributeIds.filter((id) => !validSet.has(id));
      throw new UnauthorizedAttributeError(invalidIds);
    }
  }

  async getEnabledAppCredentials(organizationId: number) {
    return this.deps.credentialRepository.findByTeamIdAndSlugs({
      teamId: organizationId,
      slugs: enabledAppSlugs,
    });
  }

  async getAllIntegrationAttributeSyncs(organizationId: number) {
    return this.deps.integrationAttributeSyncRepository.getByOrganizationId(
      organizationId
    );
  }

  async getById(id: string) {
    return this.deps.integrationAttributeSyncRepository.getById(id);
  }

  async createAttributeSync(
    input: ZCreateAttributeSyncSchema,
    organizationId: number
  ) {
    const credential = await this.deps.credentialRepository.findByIdAndTeamId({
      id: input.credentialId,
      teamId: organizationId,
    });

    if (!credential) {
      throw new CredentialNotFoundError();
    }

    const parsedRule = attributeSyncRuleSchema.parse(input.rule);

    const teamIds = this.extractTeamIdsFromRule(parsedRule);
    await this.validateTeamsBelongToOrg(teamIds, organizationId);

    const integrationValue = credential.app?.slug || credential.type;
    if (
      !Object.values(AttributeSyncIntegrations).includes(
        integrationValue as AttributeSyncIntegrations
      )
    ) {
      throw new Error(`Unsupported integration type: ${integrationValue}`);
    }

    this.validateWithinSyncUniqueness(input.syncFieldMappings);

    await this.validateCrossSyncUniqueness(
      organizationId,
      input.syncFieldMappings
    );

    const attributeIds = input.syncFieldMappings.map((m) => m.attributeId);
    await this.validateAttributeOwnership(organizationId, attributeIds);

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
    const { syncFieldMappings, rule, ruleId, ...integrationAttributeSync } =
      data;

    this.validateWithinSyncUniqueness(syncFieldMappings);

    await this.validateCrossSyncUniqueness(
      data.organizationId,
      syncFieldMappings,
      data.id
    );

    const attributeIds = syncFieldMappings.map((m) => m.attributeId);
    await this.validateAttributeOwnership(data.organizationId, attributeIds);

    const existingFieldMappings =
      await this.deps.integrationAttributeSyncRepository.getSyncFieldMappings(
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
    const fieldMappingsToUpdate = syncFieldMappings.filter(
      (m): m is typeof m & { id: string } => "id" in m
    );

    await this.deps.integrationAttributeSyncRepository.updateTransactionWithRuleAndMappings(
      {
        integrationAttributeSync,
        attributeSyncRule: {
          id: ruleId,
          rule: parsedRule,
        },
        fieldMappingsToCreate,
        fieldMappingsToUpdate,
        fieldMappingsToDelete,
      }
    );
  }
  async deleteById(id: string) {
    return this.deps.integrationAttributeSyncRepository.deleteById(id);
  }

  async getAllByCredentialId(credentialId: number) {
    return this.deps.integrationAttributeSyncRepository.getAllByCredentialId(
      credentialId
    );
  }
}
