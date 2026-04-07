import { z } from "zod";

// Re-export fieldTypeEnum and FieldType from prisma/zod-utils for consistency with booking fields
export { fieldTypeEnum, type FieldType } from "@calcom/prisma/zod-utils";

// Legacy FieldOption for backward compatibility
export type FieldOption = {
  label: string;
  id: string | null;
};

// New FieldOption with value support (aligned with booking fields)
export type FieldOptionWithValue = {
  label: string;
  value: string;
  id?: string | null;
};

export type TNonRouterField = {
  id: string;
  label: string;
  identifier?: string;
  placeholder?: string;
  // type is kept as string for backward compatibility but should use FieldType enum values
  type: string;
  /** @deprecated in favour of `options` */
  selectText?: string;
  required?: boolean;
  deleted?: boolean;
  // Support both old format {label, id} and new format {label, value}
  options?: FieldOption[] | FieldOptionWithValue[];
  // Optional fields aligned with booking fields schema for UI consistency
  defaultLabel?: string;
  defaultPlaceholder?: string;
  minLength?: number;
  maxLength?: number;
  editable?: "system" | "system-but-optional" | "system-but-hidden" | "user" | "user-readonly";
  hidden?: boolean;
  sources?: {
    id: string;
    type: string;
    label: string;
    editUrl?: string;
    fieldRequired?: boolean;
  }[];
  disableOnPrefill?: boolean;
  variant?: string;
};

// Note: zodNonRouterField is NOT annotated with z.ZodType because it uses .extend() below
// which requires the full ZodObject type to be preserved

// Option schema supporting both legacy format {label, id} and new format {label, value}
const fieldOptionSchema = z.union([
  // Legacy format for backward compatibility
  z.object({
    label: z.string(),
    id: z.string().or(z.null()),
  }),
  // New format aligned with booking fields
  z.object({
    label: z.string(),
    value: z.string(),
    id: z.string().or(z.null()).optional(),
  }),
]);

// Field source schema (aligned with booking fields)
const fieldSourceSchema = z.object({
  id: z.string(),
  type: z.union([z.literal("user"), z.literal("system"), z.literal("default"), z.string()]),
  label: z.string(),
  editUrl: z.string().optional(),
  fieldRequired: z.boolean().optional(),
});

// Editable schema (aligned with booking fields)
const editableSchema = z.enum([
  "system",
  "system-but-optional",
  "system-but-hidden",
  "user",
  "user-readonly",
]);

export const zodNonRouterField = z.object({
  id: z.string(),
  label: z.string(),
  identifier: z.string().optional(),
  placeholder: z.string().optional(),
  type: z.string(), // Keeping as string for backward compatibility
  /**
   * @deprecated in favour of `options`
   */
  selectText: z.string().optional(),
  required: z.boolean().optional(),
  deleted: z.boolean().optional(),
  // Updated options to support both legacy and new format
  options: z.array(fieldOptionSchema).optional(),
  // New optional fields aligned with booking fields for UI consistency
  defaultLabel: z.string().optional(),
  defaultPlaceholder: z.string().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  editable: editableSchema.default("user").optional(),
  hidden: z.boolean().optional(),
  sources: z.array(fieldSourceSchema).optional(),
  disableOnPrefill: z.boolean().default(false).optional(),
  variant: z.string().optional(),
});

// This is different from FormResponse in types.d.ts in that it has label optional. We don't seem to be using label at this point, so we might want to use this only while saving the response when Routing Form is submitted
// Record key is formFieldId
export const routingFormResponseInDbSchema = z.record(
  z.object({
    label: z.string().optional(),
    value: z.union([z.string(), z.number(), z.array(z.string())]),
  })
);
