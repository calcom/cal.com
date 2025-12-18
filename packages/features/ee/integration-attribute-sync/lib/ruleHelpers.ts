import type { AttributeType } from "@calcom/prisma/enums";

import type { Condition, TeamCondition, AttributeCondition, ConditionOperator } from "../types/rule";

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
export const TEAM_OPERATOR_OPTIONS = [
  { value: "in" as const, label: "is any of" },
  { value: "notIn" as const, label: "is not any of" },
];

// Operator options based on attribute type
export const getOperatorOptionsForAttributeType = (type: AttributeType) => {
  switch (type) {
    case "SINGLE_SELECT":
      return [
        { value: "equals" as const, label: "is" },
        { value: "notEquals" as const, label: "is not" },
      ];
    case "MULTI_SELECT":
      return [
        { value: "in" as const, label: "includes any of" },
        { value: "notIn" as const, label: "does not include" },
      ];
    case "TEXT":
    case "NUMBER":
      return [
        { value: "equals" as const, label: "equals" },
        { value: "notEquals" as const, label: "not equals" },
      ];
  }
};

export const PARENT_OPERATOR_OPTIONS = [
  { value: "AND" as const, label: "All" },
  { value: "OR" as const, label: "Any" },
];

export const CONDITION_TYPE_OPTIONS = [
  { value: "teamId" as const, label: "Team" },
  { value: "attributeId" as const, label: "Attribute" },
];
