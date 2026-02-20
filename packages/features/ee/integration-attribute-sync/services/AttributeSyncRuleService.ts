import { isTeamCondition, isAttributeCondition } from "../lib/ruleHelpers";
import {
  ConditionOperatorEnum,
  type IAttributeSyncRule,
  type ITeamCondition,
  type IAttributeCondition,
  RuleOperatorEnum,
} from "../repositories/IIntegrationAttributeSyncRepository";
import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { PrismaAttributeToUserRepository } from "@calcom/features/attributes/repositories/PrismaAttributeToUserRepository";
import { getAttributeService } from "@calcom/features/attributes/di/AttributeService.container";
import type { UserAttribute } from "@calcom/features/attributes/services/AttributeService";

interface IAttributeSyncRuleServiceDeps {
  membershipRepository: MembershipRepository;
  attributeToUserRepository: PrismaAttributeToUserRepository;
}

export class AttributeSyncRuleService {
  constructor(private readonly deps: IAttributeSyncRuleServiceDeps) {}

  async shouldSyncApplyToUser({
    user,
    attributeSyncRule,
  }: {
    user: { id: number; organizationId: number };
    attributeSyncRule: IAttributeSyncRule;
  }): Promise<boolean> {
    const { operator: ruleOperator, conditions } = attributeSyncRule;

    const teamConditions = conditions.filter(isTeamCondition);
    const attributeConditions = conditions.filter(isAttributeCondition);

    const conditionChecks = await Promise.all([
      this.handleTeamConditions({ userId: user.id, teamConditions }),
      this.handleAttributeConditions({ user, attributeConditions }),
    ]);

    const conditionChecksFlattened = conditionChecks.flat();

    if (ruleOperator === RuleOperatorEnum.AND) {
      return !conditionChecksFlattened.some((condition) => !condition);
    } else {
      return conditionChecksFlattened.some((condition) => condition);
    }
  }

  private async handleTeamConditions({
    userId,
    teamConditions,
  }: {
    userId: number;
    teamConditions: ITeamCondition[];
  }) {
    const userMemberships = await this.deps.membershipRepository.findAllByUserId({
      userId,
      filters: { accepted: true },
    });

    const userTeamIdSet = new Set(userMemberships.map((membership) => membership.teamId));

    const teamConditionEvaluated: boolean[] = [];

    for (const teamCondition of teamConditions) {
      const teamIds = teamCondition.value;
      const conditionOperator = teamCondition.operator;

      for (const teamId of teamIds) {
        if (conditionOperator === ConditionOperatorEnum.IN) {
          teamConditionEvaluated.push(userTeamIdSet.has(teamId));
        }
        if (conditionOperator === ConditionOperatorEnum.NOT_IN) {
          teamConditionEvaluated.push(!userTeamIdSet.has(teamId));
        }
      }
    }

    return teamConditionEvaluated;
  }

  private async handleAttributeConditions({
    user,
    attributeConditions,
  }: {
    user: { id: number; organizationId: number };
    attributeConditions: IAttributeCondition[];
  }): Promise<boolean[]> {
    const attributeService = getAttributeService();

    const userAttributes = await attributeService.getUsersAttributesByOrgMembershipId({
      userId: user.id,
      orgId: user.organizationId,
    });

    const attributeConditionResults: boolean[] = [];

    for (const condition of attributeConditions) {
      const userAttribute = userAttributes[condition.attributeId];
      const result = this.evaluateAttributeCondition(userAttribute, condition);
      attributeConditionResults.push(result);
    }

    return attributeConditionResults;
  }

  private evaluateAttributeCondition(
    userAttribute: UserAttribute | undefined,
    condition: IAttributeCondition
  ): boolean {
    const { operator } = condition;

    if (!userAttribute) {
      if (operator === ConditionOperatorEnum.IN || operator === ConditionOperatorEnum.EQUALS) {
        return false;
      }
      // For NOT_IN/NOT_EQUALS: user doesn't have attribute, condition passes
      return true;
    }

    if (userAttribute.type === "MULTI_SELECT") {
      return this.evaluateMultiSelectCondition(userAttribute, operator, condition);
    } else {
      return this.evaluateSingleValueCondition(userAttribute, operator, condition);
    }
  }

  private evaluateMultiSelectCondition(
    userAttribute: Extract<UserAttribute, { type: "MULTI_SELECT" }>,
    operator: ConditionOperatorEnum,
    condition: IAttributeCondition
  ): boolean {
    const userAttributeOptionIds = userAttribute.optionIds;
    const conditionAttributeOptionIds = condition.value;

    switch (operator) {
      case ConditionOperatorEnum.IN:
        return conditionAttributeOptionIds.every((id) => userAttributeOptionIds.has(id));

      case ConditionOperatorEnum.NOT_IN:
        return !conditionAttributeOptionIds.some((id) => userAttributeOptionIds.has(id));

      default:
        return false;
    }
  }

  private evaluateSingleValueCondition(
    userAttribute: Extract<UserAttribute, { type: "TEXT" | "NUMBER" | "SINGLE_SELECT" }>,
    operator: ConditionOperatorEnum,
    condition: IAttributeCondition
  ): boolean {
    // For SINGLE_SELECT: condition stores option IDs, compare against optionId (exact match)
    // For TEXT/NUMBER: condition stores actual values, compare against value (case-insensitive)
    const isSingleSelect = userAttribute.type === "SINGLE_SELECT";

    const userValue = isSingleSelect ? userAttribute.optionId : (userAttribute.value?.toLowerCase() ?? null);

    const conditionValue = isSingleSelect
      ? (condition.value[0] ?? null)
      : (condition.value[0]?.toLowerCase() ?? null);

    switch (operator) {
      case ConditionOperatorEnum.EQUALS:
        return userValue === conditionValue;

      case ConditionOperatorEnum.NOT_EQUALS:
        return userValue !== conditionValue;

      default:
        return false;
    }
  }
}
