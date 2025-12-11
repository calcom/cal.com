export type RuleOperator = "AND" | "OR";
export type ConditionOperator = "equals" | "notEquals" | "in" | "notIn";
export type ConditionIdentifier = "teamId" | "attributeId";

// Base condition interface
export interface BaseCondition {
  identifier: ConditionIdentifier;
  operator: ConditionOperator;
  value: string[] | number[];
}

// Team-based condition
export interface TeamCondition extends BaseCondition {
  identifier: "teamId";
  value: number[];
}

// Attribute-based condition
export interface AttributeCondition extends BaseCondition {
  identifier: "attributeId";
  attributeId: string; // Which attribute to check
  value: string[]; // AttributeOption IDs to match
}

// Union type for all conditions
export type Condition = TeamCondition | AttributeCondition;

export interface Rule {
  operator: RuleOperator;
  conditions: Condition[];
}
