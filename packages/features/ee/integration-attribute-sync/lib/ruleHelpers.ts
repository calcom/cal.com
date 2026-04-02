import type { AttributeType } from "@calcom/prisma/enums";
import {
  ConditionIdentifierEnum,
  ConditionOperatorEnum,
  type IAttributeCondition,
  type ITeamCondition,
  RuleOperatorEnum,
  type TAttributeSyncRuleCondition,
} from "../repositories/IIntegrationAttributeSyncRepository";

type TFunction = (key: string) => string;

// Unique ID generator for React keys
export const generateConditionId = (): string => {
  return crypto.randomUUID();
};

// Extended condition types with client-side ID for React keys
export interface ITeamConditionWithId extends ITeamCondition {
  _id: string;
}

export interface IAttributeConditionWithId extends IAttributeCondition {
  _id: string;
}

export type TAttributeSyncRuleConditionWithId = ITeamConditionWithId | IAttributeConditionWithId;

// Factory functions
export const getDefaultTeamCondition = (): ITeamConditionWithId => ({
  _id: generateConditionId(),
  identifier: ConditionIdentifierEnum.TEAM_ID,
  operator: ConditionOperatorEnum.IN,
  value: [],
});

export const getDefaultAttributeCondition = (): IAttributeConditionWithId => ({
  _id: generateConditionId(),
  identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
  attributeId: "",
  operator: ConditionOperatorEnum.EQUALS,
  value: [],
});

// Type guards
export const isTeamCondition = (condition: TAttributeSyncRuleCondition): condition is ITeamCondition => {
  return condition.identifier === ConditionIdentifierEnum.TEAM_ID;
};

export const isAttributeCondition = (
  condition: TAttributeSyncRuleCondition
): condition is IAttributeCondition => {
  return condition.identifier === ConditionIdentifierEnum.ATTRIBUTE_ID;
};

export const isArrayOperator = (operator: ConditionOperatorEnum): boolean => {
  return operator === ConditionOperatorEnum.IN || operator === ConditionOperatorEnum.NOT_IN;
};

export const formatConditionValue = (
  operator: ConditionOperatorEnum,
  value: number[] | string[]
): number[] | string[] => {
  if (isArrayOperator(operator)) {
    return Array.isArray(value) ? value : value ? [value] : [];
  } else {
    return Array.isArray(value) ? value.slice(0, 1) : value ? [value] : [];
  }
};

// Operator options for teams
export const getTeamOperatorOptions = (t: TFunction) => [
  { value: ConditionOperatorEnum.IN, label: t("attribute_sync_operator_is_any_of") },
  { value: ConditionOperatorEnum.NOT_IN, label: t("attribute_sync_operator_is_not_any_of") },
];

// Operator options based on attribute type
export const getOperatorOptionsForAttributeType = (type: AttributeType, t: TFunction) => {
  switch (type) {
    case "SINGLE_SELECT":
      return [
        { value: ConditionOperatorEnum.EQUALS, label: t("attribute_sync_operator_is") },
        { value: ConditionOperatorEnum.NOT_EQUALS, label: t("attribute_sync_operator_is_not") },
      ];
    case "MULTI_SELECT":
      return [
        { value: ConditionOperatorEnum.IN, label: t("attribute_sync_operator_includes_any_of") },
        { value: ConditionOperatorEnum.NOT_IN, label: t("attribute_sync_operator_does_not_include") },
      ];
    case "TEXT":
    case "NUMBER":
      return [
        { value: ConditionOperatorEnum.EQUALS, label: t("attribute_sync_operator_equals") },
        { value: ConditionOperatorEnum.NOT_EQUALS, label: t("attribute_sync_operator_not_equals") },
      ];
  }
};

export const getParentOperatorOptions = (t: TFunction) => [
  { value: RuleOperatorEnum.AND, label: t("all") },
  { value: RuleOperatorEnum.OR, label: t("any") },
];

export const getConditionTypeOptions = (t: TFunction) => [
  { value: ConditionIdentifierEnum.TEAM_ID, label: t("team") },
  { value: ConditionIdentifierEnum.ATTRIBUTE_ID, label: t("attribute") },
];
