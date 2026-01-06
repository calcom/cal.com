import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { PrismaAttributeOptionRepository } from "@calcom/lib/server/repository/PrismaAttributeOptionRepository";

import { isTeamCondition, isAttributeCondition } from "../lib/ruleHelpers";
import {
  ConditionOperatorEnum,
  type IAttributeSyncRule,
  type ITeamCondition,
} from "../repositories/IIntegrationAttributeSyncRepository";

interface IAttributeSyncRuleServiceDeps {
  membershipRepository: MembershipRepository;
  attributeToUserRepository: PrismaAttributeOptionRepository;
}

export class AttributeSyncRuleService {
  constructor(private readonly deps: IAttributeSyncRuleServiceDeps) {}

  async shouldSyncApplyToUser({
    user,
    attributeSyncRule,
  }: {
    user: { id: number };
    attributeSyncRule: IAttributeSyncRule;
  }) {
    const { operator: ruleOperator, conditions } = attributeSyncRule;

    const teamConditions = conditions.filter(isTeamCondition);
    const attributeConditions = conditions.filter(isAttributeCondition);

    const conditionChecks = await Promise.all([
      this.handleTeamConditions({ userId: user.id, teamConditions }),
      this.handleAttributeConditions({ attributeConditions }),
    ]);

    return;
  }

  async handleTeamConditions({
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

  async handleAttributeConditions({ attributeConditions }: { attributeConditions: any }) {}
}
