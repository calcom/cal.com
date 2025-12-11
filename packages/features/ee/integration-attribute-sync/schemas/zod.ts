import z from "zod";

const ruleIdentifierEnum = z.enum(["teamId", "attributeId"]);
const ruleOperatorEnum = z.enum(["equals", "notEquals", "in", "notIn"]);

// Base condition schema
const baseConditionSchema = z.object({
  identifier: ruleIdentifierEnum,
  operator: ruleOperatorEnum,
});

// Team condition schema
const teamConditionSchema = baseConditionSchema.extend({
  identifier: z.literal("teamId"),
  value: z.array(z.number()),
});

// Attribute condition schema
const attributeConditionSchema = baseConditionSchema.extend({
  identifier: z.literal("attributeId"),
  attributeId: z.string(),
  value: z.array(z.string()),
});

// Discriminated union for conditions
export const attributeSyncRuleConditionSchema = z.discriminatedUnion("identifier", [
  teamConditionSchema,
  attributeConditionSchema,
]);

export const attributeSyncRuleSchema = z.object({
  operator: z.enum(["AND", "OR"]),
  conditions: z.array(attributeSyncRuleConditionSchema),
});

export type IAttributeSyncRule = z.infer<typeof attributeSyncRuleSchema>;

const fieldMappingSchema = z.object({
  id: z.string().optional(),
  integrationFieldName: z.string(),
  attributeId: z.string(),
  enabled: z.boolean(),
});

export const syncFormDataSchema = z
  .object({
    id: z.string(),
    credentialId: z.number(),
    enabled: z.boolean(),
    organizationId: z.number(),
    rule: attributeSyncRuleSchema,
    syncFieldMappings: z.array(fieldMappingSchema),
  })
  .passthrough(); // Allow extra fields to pass through

export type ISyncFormData = z.infer<typeof syncFormDataSchema>;
