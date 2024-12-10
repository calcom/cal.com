import { defaultEvents } from "@calcom/lib/defaultEvents";
import type { CustomField, SystemField } from "@calcom/lib/event-types/transformers";
import {
  transformLocationsApiToInternal,
  transformBookingFieldsApiToInternal,
  systemBeforeFieldName,
  systemBeforeFieldEmail,
  systemBeforeFieldLocation,
  systemAfterFieldRescheduleReason,
  transformRecurrenceApiToInternal,
} from "@calcom/lib/event-types/transformers";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import type {
  CustomFieldOutput_2024_06_14,
  EmailDefaultFieldOutput_2024_06_14,
  EventTypeOutput_2024_06_14,
  InputLocation_2024_06_14,
  NameDefaultFieldOutput_2024_06_14,
  TeamEventTypeOutput_2024_06_14,
} from "@calcom/platform-types";
import {
  bookerLayoutOptions,
  BookerLayouts,
  bookerLayouts as bookerLayoutsSchema,
  userMetadata as userMetadataSchema,
  eventTypeBookingFields,
} from "@calcom/prisma/zod-utils";

import type { BookerPlatformWrapperAtomProps } from "../../booker/BookerPlatformWrapper";

export function transformApiEventTypeForAtom(
  eventType: Omit<EventTypeOutput_2024_06_14, "ownerId"> & { bannerUrl?: string },
  entity: BookerPlatformWrapperAtomProps["entity"] | undefined,
  defaultFormValues: BookerPlatformWrapperAtomProps["defaultFormValues"] | undefined
) {
  const { lengthInMinutes, locations, bookingFields, users, recurrence, ...rest } = eventType;

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
    locations: getLocations(locations),
    bookingFields: getBookingFields(bookingFields, defaultFormValues),
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
          logoUrl: entity.logoUrl || undefined,
        }
      : {
          fromRedirectOfNonOrgLink: true,
          considerUnpublished: false,
          orgSlug: null,
          teamSlug: null,
          name: null,
          logoUrl: undefined,
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
    recurringEvent: recurrence ? transformRecurrenceApiToInternal(recurrence) : null,
  };
}

export function transformApiTeamEventTypeForAtom(
  eventType: TeamEventTypeOutput_2024_06_14,
  entity: BookerPlatformWrapperAtomProps["entity"] | undefined,
  defaultFormValues: BookerPlatformWrapperAtomProps["defaultFormValues"] | undefined
) {
  const { lengthInMinutes, locations, hosts, bookingFields, recurrence, ...rest } = eventType;

  const isDefault = isDefaultEvent(rest.title);

  const defaultEventBookerLayouts = {
    enabledLayouts: [...bookerLayoutOptions],
    defaultLayout: BookerLayouts.MONTH_VIEW,
  };
  const firstUsersMetadata = userMetadataSchema.parse({});
  const bookerLayouts = bookerLayoutsSchema.parse(
    firstUsersMetadata?.defaultBookerLayouts || defaultEventBookerLayouts
  );

  return {
    ...rest,
    length: lengthInMinutes,
    locations: getLocations(locations),
    bookingFields: getBookingFields(bookingFields, defaultFormValues),
    isDefault,
    isDynamic: false,
    profile: {
      username: "team",
      name: "Team",
      weekStart: "Sunday",
      image: "",
      brandColor: null,
      darkBrandColor: null,
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
          logoUrl: entity.logoUrl || undefined,
        }
      : {
          fromRedirectOfNonOrgLink: true,
          considerUnpublished: false,
          orgSlug: null,
          teamSlug: null,
          name: null,
          logoUrl: undefined,
        },
    hosts: hosts.map((host) => ({
      user: {
        id: host.userId,
        avatarUrl: null,
        name: host.name,
        username: "",
        metadata: {},
        darkBrandColor: null,
        brandColor: null,
        theme: null,
        weekStart: "Sunday",
      },
    })),
    users: hosts.map((host) => ({
      ...host,
      metadata: undefined,
      bookerUrl: getBookerBaseUrlSync(null),
      profile: {
        username: "",
        name: host.name,
        weekStart: "Sunday",
        image: "",
        brandColor: null,
        darkBrandColor: null,
        theme: null,
        organization: null,
        id: host.userId,
        organizationId: null,
        userId: host.userId,
        upId: `usr-${host.userId}`,
      },
    })),
    recurringEvent: recurrence ? transformRecurrenceApiToInternal(recurrence) : null,
  };
}

function isDefaultEvent(eventSlug: string) {
  const foundInDefaults = defaultEvents.find((obj) => {
    return obj.slug === eventSlug;
  });
  return !!foundInDefaults;
}

function getLocations(locations: EventTypeOutput_2024_06_14["locations"]) {
  const transformed = transformLocationsApiToInternal(
    locations.filter((location) => isAtomSupportedLocation(location))
  );

  const withPrivateHidden = transformed.map((location) => {
    const { displayLocationPublicly, type } = location;

    switch (type) {
      case "inPerson":
        return displayLocationPublicly ? location : { ...location, address: "" };
      case "link":
        return displayLocationPublicly ? location : { ...location, link: "" };
      case "userPhone":
        return displayLocationPublicly
          ? location
          : {
              ...location,
              hostPhoneNumber: "",
            };
      default:
        return location;
    }
  });

  return withPrivateHidden;
}

function isAtomSupportedLocation(
  location: EventTypeOutput_2024_06_14["locations"][number]
): location is InputLocation_2024_06_14 {
  const supportedIntegrations = ["cal-video", "google-meet"];

  return (
    location.type === "address" ||
    location.type === "attendeeAddress" ||
    location.type === "link" ||
    location.type === "phone" ||
    location.type === "attendeePhone" ||
    location.type === "attendeeDefined" ||
    (location.type === "integration" && supportedIntegrations.includes(location.integration))
  );
}

function getBookingFields(
  bookingFields: EventTypeOutput_2024_06_14["bookingFields"],
  defaultFormValues: BookerPlatformWrapperAtomProps["defaultFormValues"] | undefined
) {
  // note(Lauris): the peculiar thing about returning atom booking fields using v2 event type is that v2 event type has more possible
  // booking field outputs than inputs due to default system fields that cant be passed as inputs, which is why we take v2 from response
  // only the custom fields and default editable fields aka fields that can be passed as inputs for event type booking fields.
  const customFields: (SystemField | CustomField)[] = bookingFields
    ? transformBookingFieldsApiToInternal(
        bookingFields.filter((field) => isCustomField(field) || isDefaultEditableField(field))
      )
    : [];

  const customFieldsWithoutNameEmail = customFields.filter(
    (field) => field.type !== "name" && field.type !== "email"
  );
  const customNameField = customFields?.find((field) => field.type === "name");
  const customEmailField = customFields?.find((field) => field.type === "email");

  const systemBeforeFields: SystemField[] = [
    customNameField || systemBeforeFieldName,
    customEmailField || systemBeforeFieldEmail,
    systemBeforeFieldLocation,
  ];

  const systemAfterFields: SystemField[] = [systemAfterFieldRescheduleReason];

  const transformedBookingFields: (SystemField | CustomField)[] = [
    ...systemBeforeFields,
    ...customFieldsWithoutNameEmail,
    ...systemAfterFields,
  ];

  // note(Lauris): in web app booking form values can be passed as url query params, but booker atom does not accept booking field values via url,
  // so defaultFormValues act as a way to prefill booking form fields, and if the field in database has disableOnPrefill=true and value passed then its read only.
  const defaultFormValuesKeys = defaultFormValues ? Object.keys(defaultFormValues) : [];
  if (defaultFormValuesKeys.length) {
    for (const field of transformedBookingFields) {
      if (defaultFormValuesKeys.includes(field.name) && field.disableOnPrefill) {
        field.editable = "user-readonly";
      }
    }
  }

  return eventTypeBookingFields.brand<"HAS_SYSTEM_FIELDS">().parse(transformedBookingFields);
}

function isCustomField(
  field: EventTypeOutput_2024_06_14["bookingFields"][number]
): field is CustomFieldOutput_2024_06_14 {
  return field.type !== "unknown" && !field.isDefault;
}

function isDefaultEditableField(
  field: EventTypeOutput_2024_06_14["bookingFields"][number]
): field is NameDefaultFieldOutput_2024_06_14 | EmailDefaultFieldOutput_2024_06_14 {
  return field.type === "name" || field.type === "email";
}
