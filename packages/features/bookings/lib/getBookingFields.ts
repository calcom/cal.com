import type { LocationObject } from "@calcom/app-store/locations";
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import { fieldsThatSupportLabelAsSafeHtml } from "@calcom/features/form-builder/fieldsThatSupportLabelAsSafeHtml";
import { getFieldIdentifier } from "@calcom/features/form-builder/utils/getFieldIdentifier";
import { CAL_AI_AGENT_PHONE_NUMBER_FIELD, SMS_REMINDER_NUMBER_FIELD } from "@calcom/lib/bookings/SystemField";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import slugify from "@calcom/lib/slugify";
import type { EventType, EventTypeCustomInput } from "@calcom/prisma/client";
import { EventTypeCustomInputType } from "@calcom/prisma/enums";
import {
  BookingFieldTypeEnum,
  customInputSchema,
  EventTypeMetaDataSchema,
  eventTypeBookingFields,
  type FieldSource,
} from "@calcom/prisma/zod-utils";
import type { z } from "zod";
import {
  getAIAgentCallPhoneNumberField,
  getAIAgentCallPhoneNumberSource,
  getAttendeePhoneNumberField,
  getAttendeePhoneNumberSource,
  getSmsReminderNumberField,
  getSmsReminderNumberSource,
} from "./unified-phone-fields/fieldSources";
import {
  mergePhoneFieldSources,
  SUB_TYPE_MAP,
  splitPhoneFieldSources,
} from "./unified-phone-fields/managePhoneFields";

export type Fields = z.infer<typeof eventTypeBookingFields>;

if (typeof window !== "undefined" && !process.env.INTEGRATION_TEST_MODE) {
  // This file imports some costly dependencies, so we want to make sure it's not imported on the client side.
  throw new Error("`getBookingFields` must not be imported on the client side.");
}

/**
 * PHONE -> Phone
 */
function upperCaseToCamelCase(upperCaseString: string) {
  return upperCaseString[0].toUpperCase() + upperCaseString.slice(1).toLowerCase();
}

export {
  getSmsReminderNumberField,
  getSmsReminderNumberSource,
  getAIAgentCallPhoneNumberField,
  getAIAgentCallPhoneNumberSource,
  getAttendeePhoneNumberField,
  getAttendeePhoneNumberSource,
};

/**
 * DB sources take precedence (by id), but code-defined sources not present in
 * DB are appended so that newly introduced sources in code survive the merge.
 */
function mergeFieldSources({
  codeSources,
  dbSources,
}: {
  codeSources: FieldSource[];
  dbSources: FieldSource[];
}): FieldSource[] {
  const newCodeSources = codeSources.filter((codeSrc) => !dbSources.some((dbSrc) => dbSrc.id === codeSrc.id));
  return [...dbSources, ...newCodeSources];
}

/**
 * This fn is the key to ensure on the fly mapping of customInputs to bookingFields and ensuring that all the systems fields are present and correctly ordered in bookingFields
 */
export const getBookingFieldsWithSystemFields = ({
  bookingFields,
  disableGuests,
  isOrgTeamEvent = false,
  disableBookingTitle,
  customInputs,
  metadata,
  workflows,
  shouldMergePhoneSystemFields,
  locations = [],
}: {
  bookingFields: Fields | EventType["bookingFields"];
  disableGuests: boolean;
  isOrgTeamEvent?: boolean;
  disableBookingTitle?: boolean;
  customInputs: EventTypeCustomInput[] | z.infer<typeof customInputSchema>[];
  metadata: EventType["metadata"] | z.infer<typeof EventTypeMetaDataSchema>;
  workflows: {
    workflow: Workflow;
  }[];
  shouldMergePhoneSystemFields?: boolean | null;
  locations?: EventType["locations"] | LocationObject[];
}) => {
  const parsedMetaData = EventTypeMetaDataSchema.parse(metadata || {});
  const parsedBookingFields = eventTypeBookingFields.parse(bookingFields || []);
  const parsedCustomInputs = customInputSchema.array().parse(customInputs || []);
  const parsedLocations = (Array.isArray(locations) ? locations : []) as LocationObject[];
  workflows = workflows || [];
  return ensureBookingInputsHaveSystemFields({
    bookingFields: parsedBookingFields,
    disableGuests,
    isOrgTeamEvent,
    disableBookingTitle,
    additionalNotesRequired: parsedMetaData?.additionalNotesRequired || false,
    customInputs: parsedCustomInputs,
    workflows,
    shouldMergePhoneSystemFields,
    locations: parsedLocations,
  });
};

/**
 * Returns booking fields with system fields but with phone fields kept as separate/split fields
 * (attendeePhoneNumber, smsReminderNumber, calAIAgentPhoneNumber) instead of unified.
 * Use this only when you need to manipulate individual phone fields (e.g., upserting workflow sources).
 * For all other cases, use `getBookingFieldsWithSystemFields` which applies unification based on the event type setting.
 */
export const getBookingFieldsSplit = (
  params: Omit<Parameters<typeof getBookingFieldsWithSystemFields>[0], "shouldMergePhoneSystemFields">
) => {
  return getBookingFieldsWithSystemFields({ ...params, shouldMergePhoneSystemFields: null });
};

export const ensureBookingInputsHaveSystemFields = ({
  bookingFields,
  disableGuests,
  isOrgTeamEvent,
  disableBookingTitle,
  additionalNotesRequired,
  customInputs,
  workflows,
  shouldMergePhoneSystemFields,
  locations = [],
}: {
  bookingFields: Fields;
  disableGuests: boolean;
  isOrgTeamEvent: boolean;
  disableBookingTitle?: boolean;
  additionalNotesRequired: boolean;
  customInputs: z.infer<typeof customInputSchema>[];
  workflows: {
    workflow: Workflow;
  }[];
  shouldMergePhoneSystemFields?: boolean | null;
  locations?: LocationObject[];
}) => {
  // If bookingFields is set already, the migration is done.
  const hideBookingTitle = disableBookingTitle ?? true;
  const handleMigration = !bookingFields.length;
  const CustomInputTypeToFieldType = {
    [EventTypeCustomInputType.TEXT]: BookingFieldTypeEnum.text,
    [EventTypeCustomInputType.TEXTLONG]: BookingFieldTypeEnum.textarea,
    [EventTypeCustomInputType.NUMBER]: BookingFieldTypeEnum.number,
    [EventTypeCustomInputType.BOOL]: BookingFieldTypeEnum.boolean,
    [EventTypeCustomInputType.RADIO]: BookingFieldTypeEnum.radio,
    [EventTypeCustomInputType.PHONE]: BookingFieldTypeEnum.phone,
  };

  const smsNumberSources = [] as NonNullable<(typeof bookingFields)[number]["sources"]>;
  const calaiNumberSources = [] as NonNullable<(typeof bookingFields)[number]["sources"]>;
  workflows.forEach((workflow) => {
    workflow.workflow.steps.forEach((step) => {
      if (step.action === "SMS_ATTENDEE" || step.action === "WHATSAPP_ATTENDEE") {
        smsNumberSources.push(
          getSmsReminderNumberSource({
            workflowId: workflow.workflow.id,
            isSmsReminderNumberRequired: !!step.numberRequired,
          })
        );
      }
      if (step.action === "CAL_AI_PHONE_CALL") {
        calaiNumberSources.push(
          getAIAgentCallPhoneNumberSource({
            workflowId: workflow.workflow.id,
            isAIAgentCallPhoneNumberRequired: !!step.numberRequired,
          })
        );
      }
    });
  });

  const isEmailFieldOptional = !!bookingFields.find((field) => field.name === "email" && !field.required);

  // These fields should be added before other user fields
  const systemBeforeFields: typeof bookingFields = [
    {
      type: "name",
      // This is the `name` of the main field
      name: "name",
      editable: "system",
      // This Label is used in Email only as of now.
      defaultLabel: "your_name",
      required: true,
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    },
    {
      defaultLabel: "email_address",
      type: "email",
      name: "email",
      required: !isEmailFieldOptional,
      editable: "system-but-optional",
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    },
    {
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
        ...(shouldMergePhoneSystemFields && locations.some((l) => l.type === "phone")
          ? [
              {
                label: "Attendee Location",
                id: "attendee-location",
                type: "location" as const,
              },
            ]
          : []),
      ],
    },
    {
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
        somewhereElse: {
          type: "text",
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
    },
  ];

  // These fields should be added after other user fields
  const systemAfterFields: typeof bookingFields = [
    {
      defaultLabel: "what_is_this_meeting_about",
      type: "text",
      name: "title",
      editable: "system-but-optional",
      required: true,
      hidden: hideBookingTitle,
      defaultPlaceholder: "",
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    },
    {
      defaultLabel: "additional_notes",
      type: "textarea",
      name: "notes",
      editable: "system-but-optional",
      required: additionalNotesRequired,
      defaultPlaceholder: "share_additional_notes",
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    },
    {
      defaultLabel: "additional_guests",
      type: "multiemail",
      editable: "system-but-optional",
      name: "guests",
      defaultPlaceholder: "email",
      required: false,
      hidden: disableGuests,
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    },
    {
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
    },
  ];

  const missingSystemBeforeFields = [];
  for (const field of systemBeforeFields) {
    const existingBookingFieldIndex = bookingFields.findIndex(
      (f) => getFieldIdentifier(f.name) === getFieldIdentifier(field.name)
    );
    // Only do a push, we must not update existing system fields as user could have modified any property in it,
    if (existingBookingFieldIndex === -1) {
      missingSystemBeforeFields.push(field);
    } else {
      // Adding the fields from Code first and then fields from DB. Allows, the code to push new properties to the field
      const dbField = bookingFields[existingBookingFieldIndex];
      bookingFields[existingBookingFieldIndex] = {
        ...field,
        ...dbField,
        sources: mergeFieldSources({ codeSources: field.sources ?? [], dbSources: dbField.sources ?? [] }),
      };
    }
  }

  bookingFields = missingSystemBeforeFields.concat(bookingFields);

  if (shouldMergePhoneSystemFields === true) {
    bookingFields = mergePhoneFieldSources(bookingFields, [...smsNumberSources, ...calaiNumberSources]);
  } else {
    // 1. Split any merged sources from attendeePhoneNumber into separate fields
    // If it is null then it means there can't be anything merged, that needs explicit split.
    // Though ideally splitting an already never merged bookingFields should be no-op, it makes the intent clear and makes things easier to roll out
    if (shouldMergePhoneSystemFields === false) {
      bookingFields = splitPhoneFieldSources(bookingFields);
    }

    // 2. Tag legacy workflow sources with subType for consent footer display
    //    (needed for old event types created before subType system; no-op for newer ones)
    bookingFields = bookingFields.map((field) => {
      const subType = SUB_TYPE_MAP[getFieldIdentifier(field.name)];
      if (!subType || !field.sources) return field;
      return {
        ...field,
        sources: field.sources.map((s) => (s.type === "workflow" && !s.subType ? { ...s, subType } : s)),
      };
    });

    // 3. Add missing SMS/calAI fields when active workflows exist
    // Note: We still need workflows in `getBookingFields` due to Backward Compatibility. If we do a one time entry for all event-types, we can remove workflows from `getBookingFields`
    if (
      smsNumberSources.length &&
      !bookingFields.find((f) => getFieldIdentifier(f.name) !== getFieldIdentifier(SMS_REMINDER_NUMBER_FIELD))
    ) {
      const indexForLocation = bookingFields.findIndex(
        (f) => getFieldIdentifier(f.name) === getFieldIdentifier("location")
      );
      bookingFields.splice(indexForLocation + 1, 0, {
        ...getSmsReminderNumberField(),
        sources: smsNumberSources,
      });
    }

    if (
      calaiNumberSources.length &&
      !bookingFields.find(
        (f) => getFieldIdentifier(f.name) === getFieldIdentifier(CAL_AI_AGENT_PHONE_NUMBER_FIELD)
      )
    ) {
      const indexForLocation = bookingFields.findIndex(
        (f) => getFieldIdentifier(f.name) === getFieldIdentifier("location")
      );
      bookingFields.splice(indexForLocation + 1, 0, {
        ...getAIAgentCallPhoneNumberField(),
        sources: calaiNumberSources,
      });
    }
  }

  // Backward Compatibility: If we are migrating from old system, we need to map `customInputs` to `bookingFields`
  if (handleMigration) {
    customInputs.forEach((input, index) => {
      const label = input.label || `${upperCaseToCamelCase(input.type)}`;
      bookingFields.push({
        label: label,
        editable: "user",
        // Custom Input's slugified label was being used as query param for prefilling. So, make that the name of the field
        // Also Custom Input's label could have been empty string as well. But it's not possible to have empty name. So generate a name automatically.
        name: slugify(input.label || `${input.type}-${index + 1}`),
        placeholder: input.placeholder,
        type: CustomInputTypeToFieldType[input.type],
        required: input.required,
        options: input.options
          ? input.options.map((o) => {
              return {
                ...o,
                // Send the label as the value without any trimming or lowercase as this is what customInput are doing. It maintains backward compatibility
                value: o.label,
              };
            })
          : [],
      });
    });
  }

  const missingSystemAfterFields = [];
  for (const field of systemAfterFields) {
    const existingBookingFieldIndex = bookingFields.findIndex(
      (f) => getFieldIdentifier(f.name) === getFieldIdentifier(field.name)
    );
    // Only do a push, we must not update existing system fields as user could have modified any property in it,
    if (existingBookingFieldIndex === -1) {
      missingSystemAfterFields.push(field);
    } else {
      const dbFieldAfter = bookingFields[existingBookingFieldIndex];
      bookingFields[existingBookingFieldIndex] = {
        // Adding the fields from Code first and then fields from DB. Allows, the code to push new properties to the field
        ...field,
        ...dbFieldAfter,
        sources: mergeFieldSources({
          codeSources: field.sources ?? [],
          dbSources: dbFieldAfter.sources ?? [],
        }),
      };
    }
  }

  bookingFields = bookingFields.concat(missingSystemAfterFields).map((f) => {
    return {
      ...f,
      // TODO: This has to be a FormBuilder feature and not be specific to bookingFields. Either use zod transform in FormBuilder to add labelAsSafeHtml automatically or add a getter for fields that would do this.
      ...(fieldsThatSupportLabelAsSafeHtml.includes(f.type)
        ? { labelAsSafeHtml: markdownToSafeHTML(f.label || null) || "" }
        : null),
    };
  });

  return eventTypeBookingFields.brand<"HAS_SYSTEM_FIELDS">().parse(bookingFields);
};
