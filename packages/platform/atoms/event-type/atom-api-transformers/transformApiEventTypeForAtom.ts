import type { BookerProps } from "@calcom/features/bookings/Booker";
import { getFieldIdentifier } from "@calcom/features/form-builder/utils/getFieldIdentifier";
import { defaultEvents } from "@calcom/lib/defaultEvents";
import type { CommonField, OptionsField, SystemField } from "@calcom/lib/event-types/transformers";
import {
  transformApiEventTypeLocations,
  transformApiEventTypeBookingFields,
} from "@calcom/lib/event-types/transformers";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import type { EventTypeOutput } from "@calcom/platform-types";
import {
  bookerLayoutOptions,
  BookerLayouts,
  bookerLayouts as bookerLayoutsSchema,
  userMetadata as userMetadataSchema,
  eventTypeBookingFields,
} from "@calcom/prisma/zod-utils";

export function transformApiEventTypeForAtom(
  eventType: Omit<EventTypeOutput, "ownerId">,
  entity: BookerProps["entity"] | undefined
) {
  const { lengthInMinutes, locations, bookingFields, users, ...rest } = eventType;

  const isDefault = isDefaultEvent(rest.title);
  const user = users[0];

  const defaultEventBookerLayouts = {
    enabledLayouts: [...bookerLayoutOptions],
    defaultLayout: BookerLayouts.MONTH_VIEW,
  };
  const firstUsersMetadata = userMetadataSchema.parse(user.metadata || {});
  const bookerLayouts = bookerLayoutsSchema.parse(
    firstUsersMetadata?.defaultBookerLayouts || defaultEventBookerLayouts
  );

  return {
    ...rest,
    length: lengthInMinutes,
    locations: transformApiEventTypeLocations(locations),
    bookingFields: getBookingFields(bookingFields),
    isDefault,
    isDynamic: false,
    profile: {
      username: user.username,
      name: user.name,
      weekStart: user.weekStart,
      image: "",
      brandColor: user.brandColor,
      darkBrandColor: user.darkBrandColor,
      theme: null,
      bookerLayouts,
    },
    entity: entity
      ? {
          ...entity,
          orgSlug: entity.orgSlug || null,
          teamSlug: entity.teamSlug || null,
          fromRedirectOfNonOrgLink: true,
          name: entity.name || null,
        }
      : {
          fromRedirectOfNonOrgLink: true,
          considerUnpublished: false,
          orgSlug: null,
          teamSlug: null,
          name: null,
        },
    hosts: [],
    users: users.map((user) => ({
      ...user,
      metadata: undefined,
      bookerUrl: getBookerBaseUrlSync(null),
      profile: {
        username: user.username || "",
        name: user.name,
        weekStart: user.weekStart,
        image: "",
        brandColor: user.brandColor,
        darkBrandColor: user.darkBrandColor,
        theme: null,
        organization: null,
        id: user.id,
        organizationId: null,
        userId: user.id,
        upId: `usr-${user.id}`,
      },
    })),
  };
}

function isDefaultEvent(eventSlug: string) {
  const foundInDefaults = defaultEvents.find((obj) => {
    return obj.slug === eventSlug;
  });
  return !!foundInDefaults;
}

function getBookingFields(bookingFields: EventTypeOutput["bookingFields"]) {
  const transformedBookingFields: (CommonField | SystemField | OptionsField)[] =
    transformApiEventTypeBookingFields(bookingFields);

  // These fields should be added before other user fields
  const systemBeforeFields: SystemField[] = [
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
    },
  ];

  // These fields should be added after other user fields
  const systemAfterFields: SystemField[] = [
    {
      defaultLabel: "what_is_this_meeting_about",
      type: "text",
      name: "title",
      editable: "system-but-optional",
      required: true,
      hidden: false,
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
      required: false,
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
      hidden: true,
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

  const missingSystemBeforeFields: SystemField[] = [];

  for (const field of systemBeforeFields) {
    const existingBookingFieldIndex = transformedBookingFields.findIndex(
      (f) => getFieldIdentifier(f.name) === getFieldIdentifier(field.name)
    );
    // Only do a push, we must not update existing system fields as user could have modified any property in it,
    if (existingBookingFieldIndex === -1) {
      missingSystemBeforeFields.push(field);
    } else {
      // Adding the fields from Code first and then fields from DB. Allows, the code to push new properties to the field
      transformedBookingFields[existingBookingFieldIndex] = {
        ...field,
        ...transformedBookingFields[existingBookingFieldIndex],
      };
    }
  }

  transformedBookingFields.push(...missingSystemBeforeFields);

  const missingSystemAfterFields: SystemField[] = [];
  for (const field of systemAfterFields) {
    const existingBookingFieldIndex = transformedBookingFields.findIndex(
      (f) => getFieldIdentifier(f.name) === getFieldIdentifier(field.name)
    );
    // Only do a push, we must not update existing system fields as user could have modified any property in it,
    if (existingBookingFieldIndex === -1) {
      missingSystemAfterFields.push(field);
    } else {
      transformedBookingFields[existingBookingFieldIndex] = {
        // Adding the fields from Code first and then fields from DB. Allows, the code to push new properties to the field
        ...field,
        ...transformedBookingFields[existingBookingFieldIndex],
      };
    }
  }

  transformedBookingFields.push(...missingSystemAfterFields);
  return eventTypeBookingFields.brand<"HAS_SYSTEM_FIELDS">().parse(transformedBookingFields);
}
