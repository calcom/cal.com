import { defaultEvents } from "@calcom/lib/defaultEvents";
import type { SystemField } from "@calcom/lib/event-types/transformers";
import {
  transformLocationsApiToInternal,
  transformBookingFieldsApiResponseToInternal,
  systemBeforeFieldName,
  systemBeforeFieldEmail,
  systemBeforeFieldLocation,
  systemAfterFieldRescheduleReason,
  transformRecurrenceApiToInternal,
  transformIntervalLimitsApiToInternal,
  transformSeatsApiToInternal,
  transformEventColorsApiToInternal,
  transformConfirmationPolicyApiToInternal,
  transformFutureBookingLimitsApiToInternal,
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
  const {
    lengthInMinutes,
    lengthInMinutesOptions,
    locations,
    bookingFields,
    users,
    recurrence,
    bookingLimitsCount,
    bookingLimitsDuration,
    seats,
    color,
    confirmationPolicy,
    customName,
    useDestinationCalendarEmail,
    bookingWindow,
    ...rest
  } = eventType;

  const isDefault = isDefaultEvent(rest.title);
  const user = users[0];

  const confirmationPolicyTransformed = transformConfirmationPolicyApiToInternal(confirmationPolicy);
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
    bookingLimits: bookingLimitsCount ? transformIntervalLimitsApiToInternal(bookingLimitsCount) : undefined,
    durationLimits: bookingLimitsDuration
      ? transformIntervalLimitsApiToInternal(bookingLimitsDuration)
      : undefined,

    metadata: {
      requiresConfirmationThreshold:
        confirmationPolicyTransformed?.requiresConfirmationThreshold ?? undefined,
      multipleDuration: lengthInMinutesOptions,
    },

    requiresConfirmation: confirmationPolicyTransformed?.requiresConfirmation ?? undefined,
    requiresConfirmationWillBlockSlot:
      confirmationPolicyTransformed?.requiresConfirmationWillBlockSlot ?? undefined,

    eventTypeColor: transformEventColorsApiToInternal(color),
    recurringEvent: recurrence ? transformRecurrenceApiToInternal(recurrence) : null,
    ...transformSeatsApiToInternal(seats),
    eventName: customName,
    useEventTypeDestinationCalendarEmail: useDestinationCalendarEmail,
    ...getBookingWindow(bookingWindow),
  };
}

export function transformApiTeamEventTypeForAtom(
  eventType: TeamEventTypeOutput_2024_06_14,
  entity: BookerPlatformWrapperAtomProps["entity"] | undefined,
  defaultFormValues: BookerPlatformWrapperAtomProps["defaultFormValues"] | undefined
) {
  const {
    lengthInMinutes,
    lengthInMinutesOptions,
    locations,
    hosts,
    bookingFields,
    recurrence,
    team,
    bookingLimitsCount,
    bookingLimitsDuration,
    seats,
    color,
    confirmationPolicy,
    customName,
    useDestinationCalendarEmail,
    bookingWindow,
    ...rest
  } = eventType;

  const isDefault = isDefaultEvent(rest.title);

  const confirmationPolicyTransformed = transformConfirmationPolicyApiToInternal(confirmationPolicy);
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
      username: team?.slug ?? "team",
      name: team?.name,
      weekStart: team?.weekStart ?? "Sunday",
      image: team?.logoUrl,
      brandColor: team?.brandColor ?? null,
      darkBrandColor: team?.darkBrandColor ?? null,
      theme: team?.theme ?? null,
      bookerLayouts,
    },
    bannerUrl: team?.bannerUrl,
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
          teamSlug: team?.slug,
          name: team?.name,
          logoUrl: team?.logoUrl,
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
    bookingLimits: bookingLimitsCount ? transformIntervalLimitsApiToInternal(bookingLimitsCount) : undefined,
    durationLimits: bookingLimitsDuration
      ? transformIntervalLimitsApiToInternal(bookingLimitsDuration)
      : undefined,

    metadata: {
      requiresConfirmationThreshold:
        confirmationPolicyTransformed?.requiresConfirmationThreshold ?? undefined,
      multipleDuration: lengthInMinutesOptions,
    },

    requiresConfirmation: confirmationPolicyTransformed?.requiresConfirmation ?? undefined,
    requiresConfirmationWillBlockSlot:
      confirmationPolicyTransformed?.requiresConfirmationWillBlockSlot ?? undefined,

    eventTypeColor: transformEventColorsApiToInternal(color),
    ...transformSeatsApiToInternal(seats),
    eventName: customName,
    useEventTypeDestinationCalendarEmail: useDestinationCalendarEmail,
    ...getBookingWindow(bookingWindow),
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
  const transformedBookingFields = transformBookingFieldsApiResponseToInternal(bookingFields);

  const hasNameField = transformedBookingFields.some((field) => field.name === "name");
  const hasEmailField = transformedBookingFields.some((field) => field.name === "email");
  const hasLocationField = transformedBookingFields.some((field) => field.name === "location");
  const hasRescheduleReasonField = transformedBookingFields.some(
    (field) => field.name === "rescheduleReason"
  );

  const systemBeforeFields: SystemField[] = [];
  if (!hasNameField) {
    systemBeforeFields.push(systemBeforeFieldName);
  }
  if (!hasEmailField) {
    systemBeforeFields.push(systemBeforeFieldEmail);
  }
  if (!hasLocationField) {
    systemBeforeFields.push(systemBeforeFieldLocation);
  }
  const systemAfterFields: SystemField[] = [];
  if (!hasRescheduleReasonField) {
    systemAfterFields.push(systemAfterFieldRescheduleReason);
  }

  const fieldsWithSystem = [...systemBeforeFields, ...transformedBookingFields, ...systemAfterFields];

  // note(Lauris): in web app booking form values can be passed as url query params, but booker atom does not accept booking field values via url,
  // so defaultFormValues act as a way to prefill booking form fields, and if the field in database has disableOnPrefill=true and value passed then its read only.
  const defaultFormValuesKeys = defaultFormValues ? Object.keys(defaultFormValues) : [];
  if (defaultFormValuesKeys.length) {
    for (const field of fieldsWithSystem) {
      if (defaultFormValuesKeys.includes(field.name) && field.disableOnPrefill) {
        field.editable = "user-readonly";
      }
    }
  }

  return eventTypeBookingFields.brand<"HAS_SYSTEM_FIELDS">().parse(fieldsWithSystem);
}

function isCustomField(
  field: EventTypeOutput_2024_06_14["bookingFields"][number]
): field is CustomFieldOutput_2024_06_14 {
  return field.type !== "unknown" && !field.isDefault;
}

function getBookingWindow(inputBookingWindow: EventTypeOutput_2024_06_14["bookingWindow"]) {
  const res = transformFutureBookingLimitsApiToInternal(inputBookingWindow);
  return !!res ? res : {};
}

function isDefaultEditableField(
  field: EventTypeOutput_2024_06_14["bookingFields"][number]
): field is NameDefaultFieldOutput_2024_06_14 | EmailDefaultFieldOutput_2024_06_14 {
  return field.type === "name" || field.type === "email";
}
