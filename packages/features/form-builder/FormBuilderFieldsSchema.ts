import { z } from "zod";

export const fieldsSchema = z.array(
  z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum([
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
    ]),
    options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
    optionsInputs: z
      .record(
        z.object({
          //TODO: Support all as needed
          type: z.enum(["address", "phone"]),
          required: z.boolean().optional(),
          placeholder: z.string().optional(),
        })
      )
      .optional(),
    placeholder: z.string().optional(),
    required: z.boolean(),
    hidden: z.boolean().optional(),
    editable: z.enum([
      "system", // Can't be deleted, can't be hidden, name can't be edited, can't be marked optional
      "system-but-optional", // Can't be deleted. Name can't be edited. But can be hidden or be marked optional
      "user", // Fully editable
      "user-readonly", // All fields are readOnly.
    ]),
    sources: z
      .array(
        z.object({
          // Unique ID for the `type`. If type is workflow, it's the workflow ID
          id: z.string(),
          type: z.union([z.literal("user"), z.literal("system"), z.string()]),
          label: z.string(),
          editUrl: z.string().optional(),
        })
      )
      .optional(),
  })
);
