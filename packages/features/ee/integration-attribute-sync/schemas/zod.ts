import z from "zod";

import {
  ConditionIdentifierEnum,
  ConditionOperatorEnum,
  type IAttributeSyncRule,
  type IFieldMapping,
  type IFieldMappingFormState,
  type IFieldMappingWithOptionalId,
  type INewFieldMapping,
  type ISyncFormData,
  RuleOperatorEnum,
  type TAttributeSyncRuleCondition,
} from "../repositories/IIntegrationAttributeSyncRepository";

const conditionIdentifierSchema = z.nativeEnum(ConditionIdentifierEnum);
const conditionOperatorSchema = z.nativeEnum(ConditionOperatorEnum);
const ruleOperatorSchema = z.nativeEnum(RuleOperatorEnum);

// Base condition schema
const baseConditionSchema = z.object({
  identifier: conditionIdentifierSchema,
  operator: conditionOperatorSchema,
});

// Team condition schema
const teamConditionSchema = baseConditionSchema.extend({
  identifier: z.literal(ConditionIdentifierEnum.TEAM_ID),
  value: z.array(z.number()),
});

// Attribute condition schema
const attributeConditionSchema = baseConditionSchema.extend({
  identifier: z.literal(ConditionIdentifierEnum.ATTRIBUTE_ID),
  attributeId: z.string(),
  value: z.array(z.string()),
});

// Discriminated union for conditions
export const attributeSyncRuleConditionSchema: z.ZodType<TAttributeSyncRuleCondition> =
  z.discriminatedUnion("identifier", [teamConditionSchema, attributeConditionSchema]);

export const attributeSyncRuleSchema: z.ZodType<IAttributeSyncRule> = z.object({
  operator: ruleOperatorSchema,
  conditions: z.array(attributeSyncRuleConditionSchema),
});

// Define base schema without type annotation to preserve ZodObject methods like .extend()
const _newFieldMappingSchema = z.object({
  integrationFieldName: z.string().min(1),
  attributeId: z.string().min(1),
  enabled: z.boolean(),
});

const _fieldMappingSchema = _newFieldMappingSchema.extend({
  id: z.string(),
});

const _fieldMappingWithOptionalIdSchema = _newFieldMappingSchema.extend({
  id: z.string().optional(),
});

// Cast to ZodType for type safety
export const newFieldMappingSchema: z.ZodType<INewFieldMapping> = _newFieldMappingSchema;
export const fieldMappingSchema: z.ZodType<IFieldMapping> = _fieldMappingSchema;
export const fieldMappingWithOptionalIdSchema: z.ZodType<IFieldMappingWithOptionalId> =
  _fieldMappingWithOptionalIdSchema;

const _fieldMappingFormStateSchema: z.ZodType<IFieldMappingFormState> = z.object({
  mappings: z.array(fieldMappingWithOptionalIdSchema),
});

export const syncFormDataSchema: z.ZodType<ISyncFormData> = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  credentialId: z.number().optional(),
  enabled: z.boolean(),
  organizationId: z.number(),
  ruleId: z.string(),
  rule: attributeSyncRuleSchema,
  syncFieldMappings: z.array(z.union([fieldMappingSchema, newFieldMappingSchema])),
});
