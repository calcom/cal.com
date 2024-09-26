import type { BookerProps } from "@calcom/features/bookings/Booker";
import { defaultEvents } from "@calcom/lib/defaultEvents";
import type { CustomField, SystemField } from "@calcom/lib/event-types/transformers";
import {
  transformLocationsApiToInternal,
  transformBookingFieldsApiToInternal,
  systemBeforeFieldName,
  systemBeforeFieldEmail,
  systemBeforeFieldLocation,
  systemAfterFieldRescheduleReason,
} from "@calcom/lib/event-types/transformers";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import type {
  CustomFieldOutput_2024_06_14,
  EventTypeOutput_2024_06_14,
  TeamEventTypeOutput_2024_06_14,
} from "@calcom/platform-types";
import {
  bookerLayoutOptions,
  BookerLayouts,
  bookerLayouts as bookerLayoutsSchema,
  userMetadata as userMetadataSchema,
  eventTypeBookingFields,
} from "@calcom/prisma/zod-utils";

export function transformApiEventTypeForAtom(
  eventType: Omit<EventTypeOutput_2024_06_14, "ownerId">,
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
    locations: getLocations(locations),
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
  };
}

export function transformApiTeamEventTypeForAtom(
  eventType: TeamEventTypeOutput_2024_06_14,
  entity: BookerProps["entity"] | undefined
) {
  const { lengthInMinutes, locations, hosts, bookingFields, ...rest } = eventType;

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
    bookingFields: getBookingFields(bookingFields),
    isDefault,
    isDynamic: false,
    profile: {
      username: "team",
      name: "team",
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
  };
}

function isDefaultEvent(eventSlug: string) {
  const foundInDefaults = defaultEvents.find((obj) => {
    return obj.slug === eventSlug;
  });
  return !!foundInDefaults;
}

function getLocations(locations: EventTypeOutput_2024_06_14["locations"]) {
  const transformed = transformLocationsApiToInternal(locations);

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

function getBookingFields(bookingFields: EventTypeOutput_2024_06_14["bookingFields"]) {
  const systemBeforeFields: SystemField[] = [
    systemBeforeFieldName,
    systemBeforeFieldEmail,
    systemBeforeFieldLocation,
  ];

  const transformedCustomFields: CustomField[] = transformBookingFieldsApiToInternal(
    bookingFields.filter((field) => isCustomField(field))
  );

  const systemAfterFields: SystemField[] = [systemAfterFieldRescheduleReason];

  const transformedBookingFields: (SystemField | CustomField)[] = [
    ...systemBeforeFields,
    ...transformedCustomFields,
    ...systemAfterFields,
  ];

  return eventTypeBookingFields.brand<"HAS_SYSTEM_FIELDS">().parse(transformedBookingFields);
}

function isCustomField(
  field: EventTypeOutput_2024_06_14["bookingFields"][number]
): field is CustomFieldOutput_2024_06_14 {
  return !field.isDefault;
}
