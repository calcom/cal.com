import type { EventTypeCustomInput, EventType, Prisma, Workflow } from "@prisma/client";
import { z } from "zod";

import slugify from "@calcom/lib/slugify";
import {
  BookingFieldType,
  customInputSchema,
  eventTypeBookingFields,
  EventTypeMetaDataSchema,
} from "@calcom/prisma/zod-utils";

export const SMS_REMINDER_NUMBER_FIELD = "smsReminderNumber";

export const getSmsReminderNumberField = () =>
  ({
    name: SMS_REMINDER_NUMBER_FIELD,
    type: "phone",
    defaultLabel: "number_sms_notifications",
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
  id: "" + workflowId,
  type: "workflow",
  label: "Workflow",
  fieldRequired: isSmsReminderNumberRequired,
  editUrl: `/workflows/${workflowId}`,
});

type Fields = z.infer<typeof eventTypeBookingFields>;

const EventTypeCustomInputType = {
  TEXT: "TEXT",
  TEXTLONG: "TEXTLONG",
  NUMBER: "NUMBER",
  BOOL: "BOOL",
  RADIO: "RADIO",
  PHONE: "PHONE",
} as const;

export const SystemField = z.enum([
  "name",
  "email",
  "location",
  "notes",
  "guests",
  "rescheduleReason",
  "smsReminderNumber",
]);

/**
 * This fn is the key to ensure on the fly mapping of customInputs to bookingFields and ensuring that all the systems fields are present and correctly ordered in bookingFields
 */
export const getBookingFieldsWithSystemFields = ({
  bookingFields,
  disableGuests,
  customInputs,
  metadata,
  workflows,
}: {
  bookingFields: Fields | EventType["bookingFields"];
  disableGuests: boolean;
  customInputs: EventTypeCustomInput[] | z.infer<typeof customInputSchema>[];
  metadata: EventType["metadata"] | z.infer<typeof EventTypeMetaDataSchema>;
  workflows: Prisma.EventTypeGetPayload<{
    select: {
      workflows: {
        select: {
          workflow: {
            select: {
              id: true;
              steps: true;
            };
          };
        };
      };
    };
  }>["workflows"];
}) => {
  const parsedMetaData = EventTypeMetaDataSchema.parse(metadata || {});
  const parsedBookingFields = eventTypeBookingFields.parse(bookingFields || []);
  const parsedCustomInputs = customInputSchema.array().parse(customInputs || []);
  workflows = workflows || [];
  return ensureBookingInputsHaveSystemFields({
    bookingFields: parsedBookingFields,
    disableGuests,
    additionalNotesRequired: parsedMetaData?.additionalNotesRequired || false,
    customInputs: parsedCustomInputs,
    workflows,
  });
};

export const ensureBookingInputsHaveSystemFields = ({
  bookingFields,
  disableGuests,
  additionalNotesRequired,
  customInputs,
  workflows,
}: {
  bookingFields: Fields;
  disableGuests: boolean;
  additionalNotesRequired: boolean;
  customInputs: z.infer<typeof customInputSchema>[];
  workflows: Prisma.EventTypeGetPayload<{
    select: {
      workflows: {
        select: {
          workflow: {
            select: {
              id: true;
              steps: true;
            };
          };
        };
      };
    };
  }>["workflows"];
}) => {
  // If bookingFields is set already, the migration is done.
  const handleMigration = !bookingFields.length;
  const CustomInputTypeToFieldType = {
    [EventTypeCustomInputType.TEXT]: BookingFieldType.text,
    [EventTypeCustomInputType.TEXTLONG]: BookingFieldType.textarea,
    [EventTypeCustomInputType.NUMBER]: BookingFieldType.number,
    [EventTypeCustomInputType.BOOL]: BookingFieldType.boolean,
    [EventTypeCustomInputType.RADIO]: BookingFieldType.radio,
    [EventTypeCustomInputType.PHONE]: BookingFieldType.phone,
  };

  const smsNumberSources = [] as NonNullable<(typeof bookingFields)[number]["sources"]>;
  workflows.forEach((workflow) => {
    workflow.workflow.steps.forEach((step) => {
      if (step.action === "SMS_ATTENDEE") {
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

  // These fields should be added before other user fields
  const systemBeforeFields: typeof bookingFields = [
    {
      defaultLabel: "your_name",
      type: "name",
      name: "name",
      editable: "system",
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
      required: true,
      editable: "system",
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
      required: false,
      // Populated on the fly from locations. I don't want to duplicate storing locations and instead would like to be able to refer to locations in eventType.
      // options: `eventType.locations`
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
    },
  ];

  // These fields should be added after other user fields
  const systemAfterFields: typeof bookingFields = [
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
      defaultLabel: "reschedule_reason",
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
    const existingBookingFieldIndex = bookingFields.findIndex((f) => f.name === field.name);
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
  // Also, note that even if Workflows don't explicity add smsReminderNumber field to bookingFields, it would be added as a side effect of this backward compatibility logic
  if (smsNumberSources.length && !bookingFields.find((f) => f.name !== SMS_REMINDER_NUMBER_FIELD)) {
    const indexForLocation = bookingFields.findIndex((f) => f.name === "location");
    // Add the SMS Reminder Number field after `location` field always
    bookingFields.splice(indexForLocation + 1, 0, {
      ...getSmsReminderNumberField(),
      sources: smsNumberSources,
    });
  }

  // Backward Compatibility: If we are migrating from old system, we need to map `customInputs` to `bookingFields`
  if (handleMigration) {
    customInputs.forEach((input, index) => {
      bookingFields.push({
        label: input.label,
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
    const existingBookingFieldIndex = bookingFields.findIndex((f) => f.name === field.name);
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

  bookingFields = bookingFields.concat(missingSystemAfterFields);

  return eventTypeBookingFields.brand<"HAS_SYSTEM_FIELDS">().parse(bookingFields);
};
