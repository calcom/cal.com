import z from "zod";

// Enum schemas
const conditionIdentifierSchema = z.enum(["teamId", "attributeId"]);
const conditionOperatorSchema = z.enum(["equals", "notEquals", "in", "notIn"]);
const ruleOperatorSchema = z.enum(["AND", "OR"]);

// Base condition schema
const baseConditionSchema = z.object({
  identifier: conditionIdentifierSchema,
  operator: conditionOperatorSchema,
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
  operator: ruleOperatorSchema,
  conditions: z.array(attributeSyncRuleConditionSchema),
});

// Inferred types from schemas
export type ConditionIdentifier = z.infer<typeof conditionIdentifierSchema>;
export type ConditionOperator = z.infer<typeof conditionOperatorSchema>;
export type RuleOperator = z.infer<typeof ruleOperatorSchema>;
export type TeamCondition = z.infer<typeof teamConditionSchema>;
export type AttributeCondition = z.infer<typeof attributeConditionSchema>;
export type Condition = z.infer<typeof attributeSyncRuleConditionSchema>;
export type IAttributeSyncRule = z.infer<typeof attributeSyncRuleSchema>;

const newFieldMappingSchema = z.object({
  integrationFieldName: z.string(),
  attributeId: z.string(),
  enabled: z.boolean(),
});

const fieldMappingSchema = newFieldMappingSchema.extend({
  id: z.string(),
});

// Schema for field mapping with optional id (used in form state)
const fieldMappingWithOptionalIdSchema = newFieldMappingSchema.extend({
  id: z.string().optional(),
});

const _fieldMappingFormStateSchema = z.object({
  mappings: z.array(fieldMappingWithOptionalIdSchema),
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

export type FieldMapping = z.infer<typeof fieldMappingWithOptionalIdSchema>;
export type FieldMappingFormState = z.infer<typeof _fieldMappingFormStateSchema>;
export type ISyncFormData = z.infer<typeof syncFormDataSchema>;
