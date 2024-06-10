import { z } from "zod";

type TemplateType = "CHECK_IN_APPPOINTMENT";

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

export type FieldType = z.infer<typeof fieldTypeEnum>;

const FieldSchema = z.object({
  type: fieldTypeEnum,
  name: z.string(),
  required: z.boolean(),
  defaultLabel: z.string(),
  placeholder: z.string(),
});

const FieldsSchema = z.array(FieldSchema);

type Fields = z.infer<typeof FieldsSchema>;

export const TEMPLATES_FIELDS: Record<TemplateType, Fields> = {
  CHECK_IN_APPPOINTMENT: [
    {
      type: "text",
      name: "scheduler_name",
      required: true,
      defaultLabel: "scheduler_name",
      placeholder: "Enter your name",
    },
  ],
};
