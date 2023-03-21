import { z } from "zod";

const fieldTypeEnum = z.enum([
  "name",
  "text",
  "textarea",
  "number",
  "email",
  "phone",
  "address",
  "multiemail",
  "select",
  "multiselect",
  "checkbox",
  "radio",
  "radioInput",
  "boolean",
]);

export const EditableSchema = z.enum([
  "system", // Can't be deleted, can't be hidden, name can't be edited, can't be marked optional
  "system-but-optional", // Can't be deleted. Name can't be edited. But can be hidden or be marked optional
  "user", // Fully editable
  "user-readonly", // All fields are readOnly.
]);
export type ALL_VIEWS = "ALL_VIEWS";
const fieldSchema = z.object({
  name: z.string(),
  // TODO: We should make at least one of `defaultPlaceholder` and `placeholder` required. Do the same for label.
  label: z.string().optional(),
  placeholder: z.string().optional(),

  /**
   * Supports translation
   */
  defaultLabel: z.string().optional(),
  defaultPlaceholder: z.string().optional(),
  views: z
    .object({
      label: z.string(),
      id: z.string(),
      description: z.string().optional(),
    })
    .array()
    .optional(),
  type: fieldTypeEnum,
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  optionsInputs: z
    .record(
      z.object({
        // Support all types as needed
        // Must be a subset of `fieldTypeEnum`.TODO: Enforce it in TypeScript
        type: z.enum(["address", "phone", "text"]),
        required: z.boolean().optional(),
        placeholder: z.string().optional(),
      })
    )
    .optional(),

  required: z.boolean().default(false).optional(),
  hidden: z.boolean().optional(),
  editable: z
    .enum([
      "system", // Can't be deleted, can't be hidden, name can't be edited, can't be marked optional
      "system-but-optional", // Can't be deleted. Name can't be edited. But can be hidden or be marked optional
      "user", // Fully editable
      "user-readonly", // All fields are readOnly.
    ])
    .default("user")
    .optional(),
  sources: z
    .array(
      z.object({
        // Unique ID for the `type`. If type is workflow, it's the workflow ID
        id: z.string(),
        type: z.union([z.literal("user"), z.literal("system"), z.string()]),
        label: z.string(),
        editUrl: z.string().optional(),
        // Mark if a field is required by this source or not. This allows us to set `field.required` based on all the sources' fieldRequired value
        fieldRequired: z.boolean().optional(),
      })
    )
    .optional(),
});

export const fieldsSchema = z.array(fieldSchema);
