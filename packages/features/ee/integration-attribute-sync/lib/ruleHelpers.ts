import type { AttributeType } from "@calcom/prisma/enums";

import type { Condition, TeamCondition, AttributeCondition, ConditionOperator } from "../schemas/zod";

type TFunction = (key: string) => string;

// Factory functions
export const getDefaultTeamCondition = (): TeamCondition => ({
  identifier: "teamId",
  operator: "in",
  value: [],
});

export const getDefaultAttributeCondition = (): AttributeCondition => ({
  identifier: "attributeId",
  attributeId: "",
  operator: "equals",
  value: [],
});

// Type guards
export const isTeamCondition = (condition: Condition): condition is TeamCondition => {
  return condition.identifier === "teamId";
};

export const isAttributeCondition = (condition: Condition): condition is AttributeCondition => {
  return condition.identifier === "attributeId";
};

export const isArrayOperator = (operator: ConditionOperator): boolean => {
  return operator === "in" || operator === "notIn";
};

export const formatConditionValue = (
  operator: ConditionOperator,
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
  { value: "in" as const, label: t("attribute_sync_operator_is_any_of") },
  { value: "notIn" as const, label: t("attribute_sync_operator_is_not_any_of") },
];

// Operator options based on attribute type
export const getOperatorOptionsForAttributeType = (type: AttributeType, t: TFunction) => {
  switch (type) {
    case "SINGLE_SELECT":
      return [
        { value: "equals" as const, label: t("attribute_sync_operator_is") },
        { value: "notEquals" as const, label: t("attribute_sync_operator_is_not") },
      ];
    case "MULTI_SELECT":
      return [
        { value: "in" as const, label: t("attribute_sync_operator_includes_any_of") },
        { value: "notIn" as const, label: t("attribute_sync_operator_does_not_include") },
      ];
    case "TEXT":
    case "NUMBER":
      return [
        { value: "equals" as const, label: t("attribute_sync_operator_equals") },
        { value: "notEquals" as const, label: t("attribute_sync_operator_not_equals") },
      ];
  }
};

export const getParentOperatorOptions = (t: TFunction) => [
  { value: "AND" as const, label: t("all") },
  { value: "OR" as const, label: t("any") },
];

export const getConditionTypeOptions = (t: TFunction) => [
  { value: "teamId" as const, label: t("team") },
  { value: "attributeId" as const, label: t("attribute") },
];
