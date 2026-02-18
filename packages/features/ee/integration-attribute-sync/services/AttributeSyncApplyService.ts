import type { PrismaAttributeRepository } from "@calcom/features/attributes/repositories/PrismaAttributeRepository";
import type { AttributeService } from "@calcom/features/attributes/services/AttributeService";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";

import type { IIntegrationAttributeSyncRepository } from "../repositories/IIntegrationAttributeSyncRepository";
import type { AttributeSyncRuleService } from "./AttributeSyncRuleService";
import type { AttributeSyncFieldMappingService } from "./AttributeSyncFieldMappingService";

const log = logger.getSubLogger({ prefix: ["[AttributeSyncApplyService]"] });

export interface AttributeChangePreview {
  attributeId: string;
  attributeName: string;
  attributeType: string;
  currentValue: string | null;
  newValue: string | null;
}

export interface UserSyncPreview {
  userId: number;
  userName: string | null;
  userEmail: string;
  changes: AttributeChangePreview[];
}

export interface SyncApplyResult {
  syncedUserCount: number;
  totalMatchedUsers: number;
}

interface IAttributeSyncApplyServiceDeps {
  integrationAttributeSyncRepository: IIntegrationAttributeSyncRepository;
  attributeSyncRuleService: AttributeSyncRuleService;
  attributeSyncFieldMappingService: AttributeSyncFieldMappingService;
  attributeRepository: PrismaAttributeRepository;
  attributeService: AttributeService;
}

export class AttributeSyncApplyService {
  constructor(private readonly deps: IAttributeSyncApplyServiceDeps) {}

  async getPreview({
    syncId,
    organizationId,
    orgMembers,
    integrationFieldsByEmail,
  }: {
    syncId: string;
    organizationId: number;
    orgMembers: Array<{ userId: number; userName: string | null; userEmail: string }>;
    integrationFieldsByEmail: Record<string, Record<string, string>>;
  }): Promise<UserSyncPreview[]> {
    const sync = await this.deps.integrationAttributeSyncRepository.getById(syncId);
    if (!sync) {
      throw ErrorWithCode.Factory.NotFound("Sync configuration not found");
    }

    const enabledMappings = sync.syncFieldMappings.filter((m) => m.enabled);
    if (enabledMappings.length === 0) {
      return [];
    }

    const attributeIds = enabledMappings.map((m) => m.attributeId);
    const attributes = await this.deps.attributeRepository.findManyByIdsAndOrgIdWithOptions({
      attributeIds,
      orgId: organizationId,
    });
    const attributeMap = new Map(attributes.map((a) => [a.id, a]));

    const previews: UserSyncPreview[] = [];

    for (const member of orgMembers) {
      if (sync.attributeSyncRule) {
        const shouldApply = await this.deps.attributeSyncRuleService.shouldSyncApplyToUser({
          user: { id: member.userId, organizationId },
          attributeSyncRule: sync.attributeSyncRule.rule,
        });
        if (!shouldApply) continue;
      }

      const userIntegrationFields = integrationFieldsByEmail[member.userEmail.toLowerCase()];
      if (!userIntegrationFields) continue;

      const currentAttributes = await this.deps.attributeService.getUsersAttributesByOrgMembershipId({
        userId: member.userId,
        orgId: organizationId,
      });

      const changes: AttributeChangePreview[] = [];

      for (const mapping of enabledMappings) {
        const rawValue = userIntegrationFields[mapping.integrationFieldName];
        if (rawValue === undefined) continue;

        const attribute = attributeMap.get(mapping.attributeId);
        if (!attribute) continue;

        const currentAttr = currentAttributes[mapping.attributeId];
        const currentValue = this.formatAttributeValue(currentAttr);
        const newValue = rawValue ? String(rawValue).replaceAll(";", ",") : null;

        if (currentValue !== newValue) {
          changes.push({
            attributeId: mapping.attributeId,
            attributeName: attribute.name,
            attributeType: attribute.type,
            currentValue,
            newValue,
          });
        }
      }

      if (changes.length > 0) {
        previews.push({
          userId: member.userId,
          userName: member.userName,
          userEmail: member.userEmail,
          changes,
        });
      }
    }

    return previews;
  }

  async apply({
    syncId,
    organizationId,
    orgMembers,
    integrationFieldsByEmail,
  }: {
    syncId: string;
    organizationId: number;
    orgMembers: Array<{ userId: number; userName: string | null; userEmail: string }>;
    integrationFieldsByEmail: Record<string, Record<string, string>>;
  }): Promise<SyncApplyResult> {
    const sync = await this.deps.integrationAttributeSyncRepository.getById(syncId);
    if (!sync) {
      throw ErrorWithCode.Factory.NotFound("Sync configuration not found");
    }

    let totalMatchedUsers = 0;
    let syncedUserCount = 0;

    for (const member of orgMembers) {
      if (sync.attributeSyncRule) {
        const shouldApply = await this.deps.attributeSyncRuleService.shouldSyncApplyToUser({
          user: { id: member.userId, organizationId },
          attributeSyncRule: sync.attributeSyncRule.rule,
        });
        if (!shouldApply) continue;
      }

      totalMatchedUsers++;

      const userIntegrationFields = integrationFieldsByEmail[member.userEmail.toLowerCase()];
      if (!userIntegrationFields) continue;

      const normalizedFields = Object.fromEntries(
        Object.entries(userIntegrationFields)
          .filter(([, value]) => value != null)
          .map(([key, value]) => [key, String(value).replaceAll(";", ",")])
      );

      try {
        await this.deps.attributeSyncFieldMappingService.syncIntegrationFieldsToAttributes({
          userId: member.userId,
          organizationId,
          syncFieldMappings: sync.syncFieldMappings,
          integrationFields: normalizedFields,
        });
        syncedUserCount++;
      } catch (error) {
        log.error(`Failed to sync attributes for user ${member.userId}`, { error });
      }
    }

    return { syncedUserCount, totalMatchedUsers };
  }

  private formatAttributeValue(
    attr:
      | { type: "MULTI_SELECT"; optionIds: Set<string>; values: Set<string> }
      | { type: "TEXT" | "NUMBER" | "SINGLE_SELECT"; optionId: string | null; value: string | null }
      | undefined
  ): string | null {
    if (!attr) return null;

    if (attr.type === "MULTI_SELECT") {
      const values = Array.from(attr.values);
      return values.length > 0 ? values.join(", ") : null;
    }

    return attr.value ?? null;
  }
}
