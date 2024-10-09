import { z } from "zod";

import type {
  OutputBookingField_2024_06_14,
  DefaultFieldOutput_2024_06_14,
  CustomFieldOutput_2024_06_14,
} from "@calcom/platform-types";

export function transformBookingFieldsInternalToApi(
  databaseBookingFields: (SystemField | CustomField)[]
): OutputBookingField_2024_06_14[] {
  const defaultFields: SystemField[] = databaseBookingFields.filter(
    (field): field is SystemField => field.editable === "system" || field.editable === "system-but-optional"
  );

  const customFields: CustomField[] = databaseBookingFields.filter(
    (field): field is CustomField => field.editable === "user"
  );

  const responseDefaultFields: DefaultFieldOutput_2024_06_14[] = defaultFields.map((field) => {
    switch (field.name) {
      case "name":
        return {
          isDefault: true,
          type: field.type,
          slug: field.name,
          required: field.required,
        };
      case "email":
        return {
          isDefault: true,
          type: field.type,
          slug: field.name,
          required: field.required,
        };
      case "location":
        return {
          isDefault: true,
          type: field.type,
          slug: field.name,
          required: field.required,
        };
      case "rescheduleReason":
        return {
          isDefault: true,
          type: field.type,
          slug: field.name,
          required: field.required,
        };
      case "title":
        return {
          isDefault: true,
          type: field.type,
          slug: field.name,
          required: field.required,
        };
      case "notes":
        return {
          isDefault: true,
          type: field.type,
          slug: field.name,
          required: field.required,
        };
      case "guests":
        return {
          isDefault: true,
          type: field.type,
          slug: field.name,
          required: field.required,
        };
      default:
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        throw new Error(`Unsupported default booking field '${field.name}'.`);
    }
  });

  const responseCustomFields: CustomFieldOutput_2024_06_14[] = customFields.map((field) => {
    switch (field.type) {
      case "phone":
        return {
          isDefault: false,
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "address":
        return {
          isDefault: false,
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "text":
        return {
          isDefault: false,
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "number":
        return {
          isDefault: false,
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "textarea":
        return {
          isDefault: false,
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "multiemail":
        return {
          isDefault: false,
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "boolean":
        return {
          isDefault: false,
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
        };
      case "select":
        return {
          isDefault: false,
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
          options: field.options ? field.options.map((option) => option.value) : [],
        };
      case "multiselect":
        return {
          isDefault: false,
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          options: field.options ? field.options?.map((option) => option.value) : [],
        };
      case "checkbox":
        return {
          isDefault: false,
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          options: field.options ? field.options?.map((option) => option.value) : [],
        };
      case "radio":
        return {
          isDefault: false,
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          options: field.options ? field.options?.map((option) => option.value) : [],
        };
      default:
        throw new Error(`Unsupported booking field type '${field.type}'.`);
    }
  });

  return [...responseDefaultFields, ...responseCustomFields];
}

const CustomFieldTypeEnum = z.enum([
  "number",
  "boolean",
  "address",
  "text",
  "textarea",
  "phone",
  "multiemail",
  "select",
  "multiselect",
  "checkbox",
  "radio",
  "radioInput",
]);

const CustomFieldsSchema = z.object({
  name: z.string(),
  type: CustomFieldTypeEnum,
  label: z.string(),
  sources: z.array(
    z.object({
      id: z.literal("user"),
      type: z.literal("user"),
      label: z.literal("User"),
      fieldRequired: z.literal(true),
    })
  ),
  editable: z.literal("user"),
  required: z.boolean(),
  placeholder: z.string().optional(),
  options: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    )
    .optional(),
});

const SystemFieldSchema = z.object({
  defaultLabel: z.string(),
  label: z.string().optional(),
  editable: z.enum(["system-but-optional", "system", "user-readonly"]),
  sources: z.array(
    z.object({
      id: z.literal("default"),
      type: z.literal("default"),
      label: z.literal("Default"),
    })
  ),
  views: z
    .array(
      z.object({
        id: z.enum(["reschedule"]),
        label: z.string(),
      })
    )
    .optional(),
  defaultPlaceholder: z.enum(["", "share_additional_notes", "email", "reschedule_placeholder"]).optional(),
  hidden: z.boolean().optional(),
  required: z.boolean(),
  hideWhenJustOneOption: z.boolean().optional(),
  getOptionsAt: z.enum(["locations"]).optional(),
  optionsInputs: z
    .object({
      attendeeInPerson: z.object({
        type: z.literal("address"),
        required: z.boolean(),
        placeholder: z.string(),
      }),
      phone: z.object({
        type: z.literal("phone"),
        required: z.boolean(),
        placeholder: z.string(),
      }),
    })
    .optional(),
});

const NameSystemFieldSchema = SystemFieldSchema.extend({
  name: z.literal("name"),
  type: z.literal("name"),
  required: z.literal(true),
});

const EmailSystemFieldSchema = SystemFieldSchema.extend({
  name: z.literal("email"),
  type: z.literal("email"),
  required: z.literal(true),
});

const RescheduleReasonSystemFieldSchema = SystemFieldSchema.extend({
  name: z.literal("rescheduleReason"),
  type: z.literal("textarea"),
  required: z.literal(false),
});

const LocationReasonSystemFieldSchema = SystemFieldSchema.extend({
  name: z.literal("location"),
  type: z.literal("radioInput"),
  required: z.literal(false),
});

const TitleSystemFieldSchema = SystemFieldSchema.extend({
  name: z.literal("title"),
  type: z.literal("text"),
  required: z.literal(true),
});

const NotesSystemFieldSchema = SystemFieldSchema.extend({
  name: z.literal("notes"),
  type: z.literal("textarea"),
  required: z.literal(false),
});

const GuestsSystemFieldSchema = SystemFieldSchema.extend({
  name: z.literal("guests"),
  type: z.literal("multiemail"),
  required: z.literal(false),
});

type NameSystemField = z.infer<typeof NameSystemFieldSchema>;
type EmailSystemField = z.infer<typeof EmailSystemFieldSchema>;
type RescheduleReasonSystemField = z.infer<typeof RescheduleReasonSystemFieldSchema>;
type LocationReasonSystemField = z.infer<typeof LocationReasonSystemFieldSchema>;
type TitleSystemField = z.infer<typeof TitleSystemFieldSchema>;
type NotesSystemField = z.infer<typeof NotesSystemFieldSchema>;
type GuestsSystemField = z.infer<typeof GuestsSystemFieldSchema>;

export type SystemField =
  | NameSystemField
  | EmailSystemField
  | RescheduleReasonSystemField
  | LocationReasonSystemField
  | TitleSystemField
  | NotesSystemField
  | GuestsSystemField;

export type CustomField = z.infer<typeof CustomFieldsSchema>;

const SystemFieldsSchema = z.union([
  NameSystemFieldSchema,
  EmailSystemFieldSchema,
  LocationReasonSystemFieldSchema,
  RescheduleReasonSystemFieldSchema,
  TitleSystemFieldSchema,
  NotesSystemFieldSchema,
  GuestsSystemFieldSchema,
]);

export const BookingFieldsSchema = z.array(z.union([CustomFieldsSchema, SystemFieldsSchema]));

export const systemBeforeFieldName: NameSystemField = {
  type: "name",
  name: "name",
  editable: "system",
  defaultLabel: "your_name",
  required: true,
  sources: [
    {
      label: "Default",
      id: "default",
      type: "default",
    },
  ],
};

export const systemBeforeFieldNameReadOnly: NameSystemField = {
  type: "name",
  name: "name",
  editable: "user-readonly",
  defaultLabel: "your_name",
  required: true,
  sources: [
    {
      label: "Default",
      id: "default",
      type: "default",
    },
  ],
};

export const systemBeforeFieldEmail: EmailSystemField = {
  defaultLabel: "email_address",
  type: "email",
  name: "email",
  required: true,
  editable: "system",
  sources: [
    {
      label: "Default",
      id: "default",
      type: "default",
    },
  ],
};

export const systemBeforeFieldEmailReadOnly: EmailSystemField = {
  defaultLabel: "email_address",
  type: "email",
  name: "email",
  required: true,
  editable: "user-readonly",
  sources: [
    {
      label: "Default",
      id: "default",
      type: "default",
    },
  ],
};

export const systemBeforeFieldLocation: LocationReasonSystemField = {
  defaultLabel: "location",
  type: "radioInput",
  name: "location",
  editable: "system",
  hideWhenJustOneOption: true,
  required: false,
  getOptionsAt: "locations",
  optionsInputs: {
    attendeeInPerson: {
      type: "address",
      required: true,
      placeholder: "",
    },
    phone: {
      type: "phone",
      required: true,
      placeholder: "",
    },
  },
  sources: [
    {
      label: "Default",
      id: "default",
      type: "default",
    },
  ],
};

export const systemAfterFieldRescheduleReason: RescheduleReasonSystemField = {
  defaultLabel: "reason_for_reschedule",
  type: "textarea",
  editable: "system-but-optional",
  name: "rescheduleReason",
  defaultPlaceholder: "reschedule_placeholder",
  required: false,
  views: [
    {
      id: "reschedule",
      label: "Reschedule View",
    },
  ],
  sources: [
    {
      label: "Default",
      id: "default",
      type: "default",
    },
  ],
};
