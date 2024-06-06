import { z } from "zod";

import slugify from "@calcom/lib/slugify";
import type { CreateEventTypeInput, Integration } from "@calcom/platform-types";

const integrationsMapping: Record<Integration, string> = {
  "cal-video": "integrations:daily",
};

function transformApiEventTypeLocations(inputLocations: CreateEventTypeInput["locations"]) {
  if (!inputLocations) {
    return [];
  }

  return inputLocations.map((location) => {
    const { type } = location;
    switch (type) {
      case "address":
        return { type: "inPerson", address: location.address };
      case "link":
        return { type: "link", link: location.link };
      case "integration":
        const integrationLabel = integrationsMapping[location.integration];
        return { type: integrationLabel };
      case "phone":
        return { type: "userPhone", hostPhoneNumber: location.phone };
      default:
        throw new Error(`Unsupported location type '${type}'`);
    }
  });
}

const integrationsMappingSchema = {
  "cal-video": z.literal("integrations:daily"),
};

const InPersonSchema = z.object({
  type: z.literal("inPerson"),
  address: z.string(),
});

const LinkSchema = z.object({
  type: z.literal("link"),
  link: z.string().url(),
});

const IntegrationSchema = z.object({
  type: z.union([integrationsMappingSchema["cal-video"], integrationsMappingSchema["cal-video"]]),
});

const UserPhoneSchema = z.object({
  type: z.literal("userPhone"),
  hostPhoneNumber: z.string(),
});

const TransformedLocationSchema = z.union([InPersonSchema, LinkSchema, IntegrationSchema, UserPhoneSchema]);
export const TransformedLocationsSchema = z.array(TransformedLocationSchema);

function transformApiEventTypeBookingFields(
  inputBookingFields: CreateEventTypeInput["bookingFields"]
): BookingFields | undefined {
  if (!inputBookingFields) {
    return undefined;
  }

  return inputBookingFields.map((field) => {
    const commonFields: CommonField = {
      name: slugify(field.label),
      type: field.type,
      label: field.label,
      sources: [
        {
          id: "user",
          type: "user",
          label: "User",
          fieldRequired: true,
        },
      ],
      editable: "user",
      required: field.required,
      placeholder: "placeholder" in field && field.placeholder ? field.placeholder : "",
    };

    const options = "options" in field && field.options ? transformSelectOptions(field.options) : undefined;

    if (!options) {
      return commonFields;
    }

    return {
      ...commonFields,
      options,
    };
  });
}

function transformSelectOptions(options: string[]) {
  return options.map((option) => ({
    label: option,
    value: option,
  }));
}

const FieldTypeEnum = z.enum([
  "number",
  "boolean",
  "address",
  "name",
  "text",
  "textarea",
  "email",
  "phone",
  "multiemail",
  "select",
  "multiselect",
  "checkbox",
  "radio",
]);

const CommonFieldsSchema = z.object({
  name: z.string(),
  type: FieldTypeEnum,
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
});

type CommonField = z.infer<typeof CommonFieldsSchema>;

// Options schema, assuming it could be undefined
const OptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

// Schema for booking fields that might contain options
const BookingFieldSchema = CommonFieldsSchema.extend({
  options: z.array(OptionSchema).optional(),
});

// Schema for the entire transformed array of booking fields
export const BookingFieldsSchema = z.array(BookingFieldSchema);
type BookingFields = z.infer<typeof BookingFieldsSchema>;

export { transformApiEventTypeLocations, transformApiEventTypeBookingFields };
