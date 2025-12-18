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

const newFieldMappingSchema = z.object({
  integrationFieldName: z.string(),
  attributeId: z.string(),
  enabled: z.boolean(),
});

const fieldMappingSchema = newFieldMappingSchema.extend({
  id: z.string(),
});

export const syncFormDataSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, "Name is required"),
    credentialId: z.number().optional(),
    enabled: z.boolean(),
    organizationId: z.number(),
    ruleId: z.string(),
    rule: attributeSyncRuleSchema,
    syncFieldMappings: z.array(z.union([fieldMappingSchema, newFieldMappingSchema])),
  })
  .passthrough(); // Allow extra fields to pass through

export type ISyncFormData = z.infer<typeof syncFormDataSchema>;
