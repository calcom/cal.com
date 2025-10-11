import type { z } from "zod";

import {
  SMS_REMINDER_NUMBER_FIELD,
  CAL_AI_AGENT_PHONE_NUMBER_FIELD,
} from "@calcom/lib/SystemField";
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import { fieldsThatSupportLabelAsSafeHtml } from "@calcom/features/form-builder/fieldsThatSupportLabelAsSafeHtml";
import { getFieldIdentifier } from "@calcom/features/form-builder/utils/getFieldIdentifier";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import slugify from "@calcom/lib/slugify";
import type { EventTypeCustomInput, EventType } from "@calcom/prisma/client";
import { EventTypeCustomInputType } from "@calcom/prisma/enums";
import {
  BookingFieldTypeEnum,
  customInputSchema,
  eventTypeBookingFields,
  EventTypeMetaDataSchema,
} from "@calcom/prisma/zod-utils";

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

export const getSmsReminderNumberField = () =>
  ({
    name: SMS_REMINDER_NUMBER_FIELD,
    type: "phone",
    defaultLabel: "number_text_notifications",
    defaultPlaceholder: "enter_phone_number",
    editable: "system",
  } as const);

export const getSmsReminderNumberSource = ({
  workflowId,
  isSmsReminderNumberRequired,
}: {
  workflowId: Workflow["id"];
  isSmsReminderNumberRequired: boolean;
}) => ({
  id: `${workflowId}`,
  type: "workflow",
  label: "Workflow",
  fieldRequired: isSmsReminderNumberRequired,
  editUrl: `/workflows/${workflowId}`,
});

export const getAIAgentCallPhoneNumberField = () =>
  ({
    name: CAL_AI_AGENT_PHONE_NUMBER_FIELD,
    type: "phone",
    defaultLabel: "phone_number_for_ai_call",
    defaultPlaceholder: "enter_phone_number",
    editable: "system",
  } as const);

export const getAIAgentCallPhoneNumberSource = ({
  workflowId,
  isAIAgentCallPhoneNumberRequired,
}: {
  workflowId: Workflow["id"];
  isAIAgentCallPhoneNumberRequired: boolean;
}) => ({
  id: `${workflowId}`,
  type: "workflow",
  label: "Workflow",
  fieldRequired: isAIAgentCallPhoneNumberRequired,
  editUrl: `/workflows/${workflowId}`,
});

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
}) => {
  const parsedMetaData = EventTypeMetaDataSchema.parse(metadata || {});
  const parsedBookingFields = eventTypeBookingFields.parse(bookingFields || []);
  const parsedCustomInputs = customInputSchema.array().parse(customInputs || []);
  workflows = workflows || [];
  return ensureBookingInputsHaveSystemFields({
    bookingFields: parsedBookingFields,
    disableGuests,
    isOrgTeamEvent,
    disableBookingTitle,
    additionalNotesRequired: parsedMetaData?.additionalNotesRequired || false,
    customInputs: parsedCustomInputs,
    workflows,
  });
};

export const ensureBookingInputsHaveSystemFields = ({
  bookingFields,
  disableGuests,
  isOrgTeamEvent,
  disableBookingTitle,
  additionalNotesRequired,
  customInputs,
  workflows,
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
  workflows.forEach((workflow) => {
    workflow.workflow.steps.forEach((step) => {
      if (step.action === "SMS_ATTENDEE" || step.action === "WHATSAPP_ATTENDEE") {
        const workflowId = workflow.workflow.id;
        smsNumberSources.push(
          getSmsReminderNumberSource({
            workflowId,
            isSmsReminderNumberRequired: !!step.numberRequired,
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
      bookingFields[existingBookingFieldIndex] = {
        ...field,
        ...bookingFields[existingBookingFieldIndex],
      };
    }
  }

  bookingFields = missingSystemBeforeFields.concat(bookingFields);

  // Backward Compatibility for SMS Reminder Number
  // Note: We still need workflows in `getBookingFields` due to Backward Compatibility. If we do a one time entry for all event-types, we can remove workflows from `getBookingFields`
  // Also, note that even if Workflows don't explicitly add smsReminderNumber field to bookingFields, it would be added as a side effect of this backward compatibility logic
  if (
    smsNumberSources.length &&
    !bookingFields.find((f) => getFieldIdentifier(f.name) !== getFieldIdentifier(SMS_REMINDER_NUMBER_FIELD))
  ) {
    const indexForLocation = bookingFields.findIndex(
      (f) => getFieldIdentifier(f.name) === getFieldIdentifier("location")
    );
    // Add the SMS Reminder Number field after `location` field always
    bookingFields.splice(indexForLocation + 1, 0, {
      ...getSmsReminderNumberField(),
      sources: smsNumberSources,
    });
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
      bookingFields[existingBookingFieldIndex] = {
        // Adding the fields from Code first and then fields from DB. Allows, the code to push new properties to the field
        ...field,
        ...bookingFields[existingBookingFieldIndex],
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
