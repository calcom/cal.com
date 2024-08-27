import { z } from "zod";

import {
  BookingWindowPeriodInputTypeEnum_2024_06_14,
  BookingWindowPeriodOutputTypeEnum_2024_06_14,
  BookingLimitsEnum_2024_06_14,
  BookerLayoutsInputEnum_2024_06_14,
  BookerLayoutsOutputEnum_2024_06_14,
  ConfirmationPolicyEnum,
  Frequency,
} from "@calcom/platform-enums/monorepo";
import type {
  NoticeThreshold_2024_06_14,
  RequiresConfirmationTransformedSchema,
  CreateEventTypeInput_2024_06_14,
  Integration_2024_06_14,
  BusinessDaysWindow_2024_06_14,
  RangeWindow_2024_06_14,
  TransformFutureBookingsLimitSchema_2024_06_14,
  BookingLimitsKeyOutputType_2024_06_14,
  TransformBookingLimitsSchema_2024_06_14,
  TransformRecurringEventSchema_2024_06_14,
  EventTypeColorsTransformedSchema,
} from "@calcom/platform-types";

const integrationsMapping: Record<Integration_2024_06_14, string> = {
  "cal-video": "integrations:daily",
};

function transformApiEventTypeLocations(inputLocations: CreateEventTypeInput_2024_06_14["locations"]) {
  if (!inputLocations) {
    return [];
  }

  return inputLocations.map((location) => {
    const { type } = location;
    switch (type) {
      case "address":
        return { type: "inPerson", address: location.address, displayLocationPublicly: location.public };
      case "link":
        return { type: "link", link: location.link, displayLocationPublicly: location.public };
      case "integration":
        const integrationLabel = integrationsMapping[location.integration];
        return { type: integrationLabel };
      case "phone":
        return {
          type: "userPhone",
          hostPhoneNumber: location.phone,
          displayLocationPublicly: location.public,
        };
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
  displayLocationPublicly: z.boolean().default(false),
});

const LinkSchema = z.object({
  type: z.literal("link"),
  link: z.string().url(),
  displayLocationPublicly: z.boolean().default(false),
});

const IntegrationSchema = z.object({
  type: z.union([integrationsMappingSchema["cal-video"], integrationsMappingSchema["cal-video"]]),
});

const UserPhoneSchema = z.object({
  type: z.literal("userPhone"),
  hostPhoneNumber: z.string(),
  displayLocationPublicly: z.boolean().default(false),
});

const TransformedLocationSchema = z.union([InPersonSchema, LinkSchema, IntegrationSchema, UserPhoneSchema]);
export const TransformedLocationsSchema = z.array(TransformedLocationSchema);

function transformApiEventTypeBookingFields(
  inputBookingFields: CreateEventTypeInput_2024_06_14["bookingFields"]
) {
  if (!inputBookingFields) {
    return [];
  }

  const customBookingFields = inputBookingFields.map((field) => {
    const commonFields: UserField = {
      name: field.slug,
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

  return customBookingFields;
}

function transformApiEventTypeIntervalLimits(
  inputBookingLimits: CreateEventTypeInput_2024_06_14["bookingLimitsCount"]
) {
  const res: TransformBookingLimitsSchema_2024_06_14 = {};
  inputBookingLimits &&
    Object.entries(inputBookingLimits).map(([key, value]) => {
      const outputKey: BookingLimitsKeyOutputType_2024_06_14 = BookingLimitsEnum_2024_06_14[
        key as keyof typeof BookingLimitsEnum_2024_06_14
      ] satisfies BookingLimitsKeyOutputType_2024_06_14;
      res[outputKey] = value;
    });
  return res;
}

function transformApiEventTypeFutureBookingLimits(
  inputBookingLimits: CreateEventTypeInput_2024_06_14["bookingWindow"]
): TransformFutureBookingsLimitSchema_2024_06_14 | undefined {
  switch (inputBookingLimits?.type) {
    case BookingWindowPeriodInputTypeEnum_2024_06_14.businessDays:
      return {
        periodDays: (inputBookingLimits as BusinessDaysWindow_2024_06_14).value,
        periodType: !!(inputBookingLimits as BusinessDaysWindow_2024_06_14).rolling
          ? BookingWindowPeriodOutputTypeEnum_2024_06_14.ROLLING_WINDOW
          : BookingWindowPeriodOutputTypeEnum_2024_06_14.ROLLING,
        periodCountCalendarDays: false,
      };
    case BookingWindowPeriodInputTypeEnum_2024_06_14.calendarDays:
      return {
        periodDays: (inputBookingLimits as BusinessDaysWindow_2024_06_14).value,
        periodType: !!(inputBookingLimits as BusinessDaysWindow_2024_06_14).rolling
          ? BookingWindowPeriodOutputTypeEnum_2024_06_14.ROLLING_WINDOW
          : BookingWindowPeriodOutputTypeEnum_2024_06_14.ROLLING,
        periodCountCalendarDays: true,
      };
    case BookingWindowPeriodInputTypeEnum_2024_06_14.range:
      return {
        periodType: BookingWindowPeriodOutputTypeEnum_2024_06_14.RANGE,
        periodStartDate: new Date((inputBookingLimits as RangeWindow_2024_06_14).value[0]),
        periodEndDate: new Date((inputBookingLimits as RangeWindow_2024_06_14).value[1]),
      };
    default:
      return undefined;
  }
}

function transformApiEventTypeBookerLayouts(
  inputBookerLayout: CreateEventTypeInput_2024_06_14["bookerLayouts"]
) {
  if (!inputBookerLayout) return undefined;

  const inputToOutputMap = {
    [BookerLayoutsInputEnum_2024_06_14.month]: BookerLayoutsOutputEnum_2024_06_14.month_view,
    [BookerLayoutsInputEnum_2024_06_14.week]: BookerLayoutsOutputEnum_2024_06_14.week_view,
    [BookerLayoutsInputEnum_2024_06_14.column]: BookerLayoutsOutputEnum_2024_06_14.column_view,
  };

  return {
    defaultLayout: inputToOutputMap[inputBookerLayout.defaultLayout],
    enabledLayouts: inputBookerLayout.enabledLayouts.map((layout) => inputToOutputMap[layout]),
  };
}

function transformApiEventTypeRequiresConfirmation(
  inputRequiresConfirmation: CreateEventTypeInput_2024_06_14["requiresConfirmation"]
): RequiresConfirmationTransformedSchema | undefined {
  if (!inputRequiresConfirmation) return undefined;
  switch (inputRequiresConfirmation.confirmationPolicy) {
    case ConfirmationPolicyEnum.ALWAYS:
      return {
        requiresConfirmation: true,
        requiresConfirmationThreshold: undefined,
      };
    case ConfirmationPolicyEnum.TIME:
      return {
        requiresConfirmation: false,
        requiresConfirmationThreshold: {
          ...inputRequiresConfirmation.noticeThreshold,
        } as NoticeThreshold_2024_06_14,
      };
  }
}
function transformApiEventTypeColors(
  inputEventTypeColors: CreateEventTypeInput_2024_06_14["eventTypeColor"]
): EventTypeColorsTransformedSchema | undefined {
  if (!inputEventTypeColors) return undefined;

  return {
    darkEventTypeColor: inputEventTypeColors.darkThemeColor,
    lightEventTypeColor: inputEventTypeColors.lightThemeColor,
  };
}

function transformApiEventTypeRecurrence(
  recurrence: CreateEventTypeInput_2024_06_14["recurrence"]
): TransformRecurringEventSchema_2024_06_14 | undefined {
  if (!recurrence) return undefined;
  return {
    interval: recurrence.interval,
    count: recurrence.occurrences,
    freq: Frequency[recurrence.frequency as keyof typeof Frequency],
  } satisfies TransformRecurringEventSchema_2024_06_14;
}

export function transformSelectOptions(options: string[]) {
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
  "radioInput",
]);

const UserFieldsSchema = z.object({
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
  options: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    )
    .optional(),
});

const SystemFieldsSchema = z.object({
  name: z.string(),
  type: FieldTypeEnum,
  defaultLabel: z.string(),
  label: z.string().optional(),
  editable: z.enum(["system-but-optional", "system"]),
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

export type SystemField = z.infer<typeof SystemFieldsSchema>;

export type UserField = z.infer<typeof UserFieldsSchema>;

export const BookingFieldsSchema = z.array(z.union([UserFieldsSchema, SystemFieldsSchema]));

export {
  transformApiEventTypeLocations,
  transformApiEventTypeBookingFields,
  transformApiEventTypeIntervalLimits,
  transformApiEventTypeFutureBookingLimits,
  transformApiEventTypeBookerLayouts,
  transformApiEventTypeRequiresConfirmation,
  transformApiEventTypeColors,
  transformApiEventTypeRecurrence,
};
