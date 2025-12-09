import z from "zod";

const ruleIdentifierEnum = z.enum(["teamId", "attributeId"]);
const ruleOperatorEnum = z.enum(["equals", "notEquals", "in", "notIn"]);

export const attributeSyncRuleConditionSchema = z.object({
  identifier: ruleIdentifierEnum,
  operator: ruleOperatorEnum,
  value: z.union([z.string(), z.array(z.string(), z.array(z.number()))]),
});

export const attributeSyncRuleSchema = z.object({
  operator: z.enum(["AND", "OR"]),
  conditions: z.array(attributeSyncRuleConditionSchema),
});

export type IAttributeSyncRule = z.infer<typeof attributeSyncRuleSchema>;
