import { z } from "zod";

import type {
  OutputBookingField_2024_06_14,
  DefaultFieldOutput_2024_06_14,
  CustomFieldOutput_2024_06_14,
} from "@calcom/platform-types";

export function transformBookingFieldsInternalToApi(
  databaseBookingFields: (SystemField | CustomField)[]
): OutputBookingField_2024_06_14[] {
  return databaseBookingFields.map((field) => {
    if (field.editable === "system" || field.editable === "system-but-optional") {
      switch (field.name) {
        case "name":
        case "email":
          return {
            isDefault: true,
            type: field.type,
            slug: field.name,
            required: !!field.required,
            label: field.label,
            placeholder: field.placeholder,
            disableOnPrefill: !!field.disableOnPrefill,
          } as DefaultFieldOutput_2024_06_14;
        case "location":
        case "rescheduleReason":
        case "title":
        case "notes":
        case "guests":
        case "attendeePhoneNumber":
          return {
            isDefault: true,
            type: field.type,
            slug: field.name,
            required: !!field.required,
            label: field.label,
            placeholder: field.placeholder,
            disableOnPrefill: !!field.disableOnPrefill,
            hidden: !!field.hidden,
          } as DefaultFieldOutput_2024_06_14;
        default:
          return {
            type: "unknown",
            slug: "unknown",
            bookingField: JSON.stringify(field),
          };
      }
    } else {
      switch (field.type) {
        case "phone":
        case "address":
        case "text":
        case "number":
        case "textarea":
        case "multiemail":
          return {
            isDefault: false,
            type: field.type,
            slug: field.name,
            label: field.label,
            required: !!field.required,
            placeholder: field.placeholder,
            disableOnPrefill: !!field.disableOnPrefill,
            hidden: !!field.hidden,
          } as CustomFieldOutput_2024_06_14;
        case "boolean":
          return {
            isDefault: false,
            type: field.type,
            slug: field.name,
            label: field.label,
            required: !!field.required,
            disableOnPrefill: !!field.disableOnPrefill,
            hidden: !!field.hidden,
          } as CustomFieldOutput_2024_06_14;
        case "select":
        case "multiselect":
        case "checkbox":
        case "radio":
          return {
            isDefault: false,
            type: field.type,
            slug: field.name,
            label: field.label,
            required: !!field.required,
            options: field.options ? field.options.map((option) => option.value) : [],
            ...(field.type === "select" ? { placeholder: field.placeholder } : {}),
            disableOnPrefill: !!field.disableOnPrefill,
            hidden: !!field.hidden,
          } as CustomFieldOutput_2024_06_14;
        default:
          return {
            type: "unknown",
            slug: "unknown",
            bookingField: JSON.stringify(field),
          };
      }
    }
  });
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
  labelAsSafeHtml: z.string().optional(),
  hidden: z.boolean().optional(),
  sources: z.array(
    z.object({
      id: z.literal("user"),
      type: z.literal("user"),
      label: z.literal("User"),
      fieldRequired: z.literal(true),
    })
  ),
  editable: z.enum(["user", "user-readonly"]),
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
  disableOnPrefill: z.boolean().optional(),
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
  placeholder: z.string().optional(),
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
      somewhereElse: z
        .object({
          type: z.literal("text"),
          required: z.boolean(),
          placeholder: z.string(),
        })
        .optional(),
    })
    .optional(),
  disableOnPrefill: z.boolean().optional(),
});

const NameSystemFieldSchema = SystemFieldSchema.extend({
  name: z.literal("name"),
  type: z.literal("name"),
  required: z.literal(true),
  variant: z.literal("fullName").optional(),
  variantsConfig: z
    .object({
      variants: z.object({
        fullName: z.object({
          fields: z.array(
            z.object({
              name: z.literal("fullName"),
              type: z.literal("text"),
              label: z.string().optional(),
              required: z.literal(true),
              placeholder: z.string().optional(),
            })
          ),
        }),
      }),
    })
    .optional(),
});

const PhoneSystemFieldSchema = SystemFieldSchema.extend({
  name: z.literal("attendeePhoneNumber"),
  type: z.literal("phone"),
  required: z.boolean(),
});

const EmailSystemFieldSchema = SystemFieldSchema.extend({
  name: z.literal("email"),
  type: z.literal("email"),
  required: z.boolean(),
});

const RescheduleReasonSystemFieldSchema = SystemFieldSchema.extend({
  name: z.literal("rescheduleReason"),
  type: z.literal("textarea"),
  required: z.boolean(),
});

const LocationReasonSystemFieldSchema = SystemFieldSchema.extend({
  name: z.literal("location"),
  type: z.literal("radioInput"),
  required: z.boolean(),
});

const TitleSystemFieldSchema = SystemFieldSchema.extend({
  name: z.literal("title"),
  type: z.literal("text"),
  required: z.boolean(),
});

const NotesSystemFieldSchema = SystemFieldSchema.extend({
  name: z.literal("notes"),
  type: z.literal("textarea"),
  required: z.boolean(),
});

const GuestsSystemFieldSchema = SystemFieldSchema.extend({
  name: z.literal("guests"),
  type: z.literal("multiemail"),
  required: z.boolean(),
});

export type NameSystemField = z.infer<typeof NameSystemFieldSchema>;
export type EmailSystemField = z.infer<typeof EmailSystemFieldSchema>;
type RescheduleReasonSystemField = z.infer<typeof RescheduleReasonSystemFieldSchema>;
type LocationReasonSystemField = z.infer<typeof LocationReasonSystemFieldSchema>;
type TitleSystemField = z.infer<typeof TitleSystemFieldSchema>;
type NotesSystemField = z.infer<typeof NotesSystemFieldSchema>;
type GuestsSystemField = z.infer<typeof GuestsSystemFieldSchema>;
type PhoneSystemField = z.infer<typeof PhoneSystemFieldSchema>;

export type SystemField =
  | NameSystemField
  | EmailSystemField
  | PhoneSystemField
  | RescheduleReasonSystemField
  | LocationReasonSystemField
  | TitleSystemField
  | NotesSystemField
  | GuestsSystemField;

export type CustomField = z.infer<typeof CustomFieldsSchema>;

const SystemFieldsSchema = z.union([
  NameSystemFieldSchema,
  EmailSystemFieldSchema,
  PhoneSystemFieldSchema,
  LocationReasonSystemFieldSchema,
  RescheduleReasonSystemFieldSchema,
  TitleSystemFieldSchema,
  NotesSystemFieldSchema,
  GuestsSystemFieldSchema,
]);

export const BookingFieldSchema = z.union([CustomFieldsSchema, SystemFieldsSchema]);
export const BookingFieldsSchema = z.array(BookingFieldSchema);

export const systemBeforeFieldName: NameSystemField = {
  type: "name",
  name: "name",
  editable: "system",
  defaultLabel: "your_name",
  required: true,
  variant: "fullName",
  sources: [
    {
      label: "Default",
      id: "default",
      type: "default",
    },
  ],
  variantsConfig: {
    variants: {
      fullName: {
        fields: [
          {
            name: "fullName",
            type: "text",
            required: true,
          },
        ],
      },
    },
  },
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

export const systemBeforeFieldPhone: PhoneSystemField = {
  defaultLabel: "phone_number",
  type: "phone",
  name: "attendeePhoneNumber",
  required: false,
  hidden: true,
  editable: "system-but-optional",
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
    somewhereElse: {
      type: "text",
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

export const systemAfterFieldTitle: TitleSystemField = {
  defaultLabel: "what_is_this_meeting_about",
  type: "text",
  name: "title",
  editable: "system-but-optional",
  required: true,
  hidden: true,
  defaultPlaceholder: "",
  sources: [
    {
      label: "Default",
      id: "default",
      type: "default",
    },
  ],
};

export const systemAfterFieldNotes: NotesSystemField = {
  defaultLabel: "additional_notes",
  type: "textarea",
  name: "notes",
  editable: "system-but-optional",
  required: false,
  defaultPlaceholder: "share_additional_notes",
  sources: [
    {
      label: "Default",
      id: "default",
      type: "default",
    },
  ],
};

export const systemAfterFieldGuests: GuestsSystemField = {
  defaultLabel: "additional_guests",
  type: "multiemail",
  editable: "system-but-optional",
  name: "guests",
  defaultPlaceholder: "email",
  required: false,
  hidden: false,
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
