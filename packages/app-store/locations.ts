import { BookingStatus } from "@prisma/client";
import type { TFunction } from "next-i18next";

import logger from "@calcom/lib/logger";
import { Ensure, Optional } from "@calcom/types/utils";

import type { EventLocationTypeFromAppMeta } from "../types/App";
import { appStoreMetadata } from "./apps.metadata.generated";

export type DefaultEventLocationType = {
  default: true;
  type: DefaultEventLocationTypeEnum;
  label: string;
  messageForOrganizer: string;
  category: string;

  iconUrl: string;

  // HACK: `variable` and `defaultValueVariable` are required due to legacy reason where different locations were stored in different places.
  variable: "locationType" | "locationAddress" | "address" | "locationLink" | "locationPhoneNumber" | "phone";
  defaultValueVariable: "address" | "attendeeAddress" | "link" | "hostPhoneNumber" | "phone";
} & (
  | {
      organizerInputType: "phone" | "text" | null;
      organizerInputPlaceholder?: string | null;
      attendeeInputType?: null;
      attendeeInputPlaceholder?: null;
    }
  | {
      attendeeInputType: "phone" | "attendeeAddress" | null;
      attendeeInputPlaceholder: string;
      organizerInputType?: null;
      organizerInputPlaceholder?: null;
    }
);

type EventLocationTypeFromApp = Ensure<EventLocationTypeFromAppMeta, "defaultValueVariable" | "variable">;

export type EventLocationType = DefaultEventLocationType | EventLocationTypeFromApp;

export const DailyLocationType = "integrations:daily";

export enum DefaultEventLocationTypeEnum {
  /**
   * Booker Address
   */
  AttendeeInPerson = "attendeeInPerson",
  /**
   * Organizer Address
   */
  InPerson = "inPerson",
  /**
   * Booker Phone
   */
  Phone = "phone",
  /**
   * Organizer Phone
   */
  UserPhone = "userPhone",
  Link = "link",
}

export const defaultLocations: DefaultEventLocationType[] = [
  {
    default: true,
    type: DefaultEventLocationTypeEnum.AttendeeInPerson,
    label: "in_person_attendee_address",
    variable: "address",
    organizerInputType: null,
    messageForOrganizer: "Cal will ask your invitee to enter an address before scheduling.",
    attendeeInputType: "attendeeAddress",
    attendeeInputPlaceholder: "enter_address",
    defaultValueVariable: "attendeeAddress",
    iconUrl: "/map-pin.svg",
    category: "in person",
  },
  {
    default: true,
    type: DefaultEventLocationTypeEnum.InPerson,
    label: "In Person (Organizer Address)",
    organizerInputType: "text",
    messageForOrganizer: "Provide an Address or Place",
    // HACK:
    variable: "locationAddress",
    defaultValueVariable: "address",
    iconUrl: "/map-pin.svg",
    category: "in person",
  },
  {
    default: true,
    type: DefaultEventLocationTypeEnum.Link,
    label: "Link",
    organizerInputType: "text",
    variable: "locationLink",
    messageForOrganizer: "Provide a Meeting Link",
    defaultValueVariable: "link",
    iconUrl: "/link.svg",
    category: "other",
  },
  {
    default: true,
    type: DefaultEventLocationTypeEnum.Phone,
    label: "Attendee Phone Number",
    variable: "phone",
    organizerInputType: null,
    attendeeInputType: "phone",
    attendeeInputPlaceholder: `enter_phone_number`,
    defaultValueVariable: "phone",
    messageForOrganizer: "Cal will ask your invitee to enter a phone number before scheduling.",
    // This isn't inputType phone because organizer doesn't need to provide it.
    // inputType: "phone"
    iconUrl: "/phone.svg",
    category: "phone",
  },
  {
    default: true,
    type: DefaultEventLocationTypeEnum.UserPhone,
    label: "Organizer Phone Number",
    messageForOrganizer: "Provide your phone number",
    organizerInputType: "phone",
    variable: "locationPhoneNumber",
    defaultValueVariable: "hostPhoneNumber",
    iconUrl: "/phone.svg",
    category: "phone",
  },
];

export type LocationObject = {
  type: string;
  displayLocationPublicly?: boolean;
} & Partial<Record<"address" | "attendeeAddress" | "link" | "hostPhoneNumber" | "phone", string>>;

// integrations:jitsi | 919999999999 | Delhi | https://manual.meeting.link | Around Video
export type BookingLocationValue = string;

export const AppStoreLocationType: Record<string, string> = {};

const locationsFromApps: EventLocationTypeFromApp[] = [];

for (const [appName, meta] of Object.entries(appStoreMetadata)) {
  const location = meta.appData?.location;
  if (location) {
    const newLocation = {
      ...location,
      messageForOrganizer: location.messageForOrganizer || `Set ${location.label} link`,
      iconUrl: meta.logo,
      // For All event location apps, locationLink is where we store the input
      // TODO: locationLink and link seems redundant. We can modify the code to keep just one of them.
      variable: location.variable || "locationLink",
      defaultValueVariable: location.defaultValueVariable || "link",
    };

    // Static links always require organizer to input
    if (newLocation.linkType === "static") {
      newLocation.organizerInputType = location.organizerInputType || "text";
      if (newLocation.organizerInputPlaceholder?.match(/https?:\/\//)) {
        // HACK: Translation ends up removing https? if it's in the beginning :(
        newLocation.organizerInputPlaceholder = ` ${newLocation.organizerInputPlaceholder}`;
      }
    } else {
      newLocation.organizerInputType = null;
    }

    AppStoreLocationType[appName] = newLocation.type;

    locationsFromApps.push({
      ...newLocation,
    });
  }
}

const locationsTypes = [...defaultLocations, ...locationsFromApps];
export const getStaticLinkBasedLocation = (locationType: string) =>
  locationsFromApps.find((l) => l.linkType === "static" && l.type === locationType);

export const getEventLocationTypeFromApp = (locationType: string) =>
  locationsFromApps.find((l) => l.type === locationType);

export const getEventLocationType = (locationType: string | undefined | null) =>
  locationsTypes.find((l) => l.type === locationType);

export const getEventLocationTypeFromValue = (value: string | undefined | null) => {
  if (!value) {
    return null;
  }
  return locationsTypes.find((l) => {
    if (l.default || l.linkType == "dynamic" || !l.urlRegExp) {
      return;
    }
    return new RegExp(l.urlRegExp).test(value);
  });
};

export const guessEventLocationType = (locationTypeOrValue: string | undefined | null) =>
  getEventLocationType(locationTypeOrValue) || getEventLocationTypeFromValue(locationTypeOrValue);

export const LocationType = { ...DefaultEventLocationTypeEnum, ...AppStoreLocationType };

type PrivacyFilteredLocationObject = Optional<LocationObject, "address" | "link">;

export const privacyFilteredLocations = (locations: LocationObject[]): PrivacyFilteredLocationObject[] => {
  const locationsAfterPrivacyFilter = locations.map((location) => {
    const eventLocationType = getEventLocationType(location.type);
    if (!eventLocationType) {
      logger.debug(`Couldn't find location type. App might be uninstalled: ${location.type} `);
    }
    // Filter out locations that are not to be displayed publicly
    // Display if the location can be set to public - and also display all locations like google meet etc
    if (location.displayLocationPublicly || !eventLocationType) {
      return location;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { address: _1, link: _2, hostPhoneNumber: _3, ...privacyFilteredLocation } = location;
      logger.debug("Applied Privacy Filter", location, privacyFilteredLocation);
      return privacyFilteredLocation;
    }
  });
  return locationsAfterPrivacyFilter;
};

/**
 * Use this function for translating event location to a readable string
 * @param location
 * @param t
 * @returns string
 */
export const getMessageForOrganizer = (location: string, t: TFunction) => {
  const videoLocation = getEventLocationTypeFromApp(location);
  const defaultLocation = defaultLocations.find((l) => l.type === location);
  if (defaultLocation) {
    return t(defaultLocation.messageForOrganizer);
  }
  if (videoLocation && videoLocation.linkType !== "static" && videoLocation.type !== "integrations:zoom") {
    return t(`Cal will provide a ${videoLocation.label} URL.`);
  }
  return "";
};

/**
 * Use this function to translate booking location value to a readable string
 * @param linkValue
 * @param translationFunction
 * @returns
 */
export const getHumanReadableLocationValue = (
  linkValue: string | undefined | null,
  translationFunction: TFunction
): string => {
  if (!linkValue) {
    return translationFunction("no_location");
  }

  // Just in case linkValue is a `locationType.type`(for old bookings)
  const eventLocationType = getEventLocationType(linkValue);

  if (eventLocationType) {
    // If we can find a video location based on linkValue then it means that the linkValue is something like integrations:google-meet and in that case we don't have the meeting URL to show.
    // Show a generic message in that case.
    return `${eventLocationType.label}`;
  }
  // Otherwise just show the available link value which can be a Phone number, a URL or a physical address of a place.
  return linkValue || "";
};

export const locationKeyToString = (location: LocationObject) => {
  const eventLocationType = getEventLocationType(location.type);
  if (!eventLocationType) {
    return null;
  }
  const defaultValueVariable = eventLocationType.defaultValueVariable;
  if (!defaultValueVariable) {
    console.error(`defaultValueVariable not set for ${location.type}`);
    return "";
  }
  return location[defaultValueVariable] || eventLocationType.label;
};

export const getEventLocationWithType = (
  locations: LocationObject[],
  locationType: EventLocationType["type"] | undefined
) => {
  const location = locations.find((location) => location.type === locationType);
  return location;
};

// FIXME: It assumes that type would be sent mostly now. If just in case a value and not type is sent(when old frontend sends requests to new backend), below forEach won't be able to find a match and thus bookingLocation would still be correct equal to reqBody.location
// We must handle the situation where frontend doesn't send us the value because it doesn't have it(displayLocationPublicly not set)
// But we want to store the actual location(except dynamic URL based location type) so that Emails, Calendars pick the value only.
// TODO: We must store both type as well as value so that we know the type of data that we are having. Is it an address or a phone number? This is to be done post v2.0
export const getLocationValueForDB = (
  bookingLocationTypeOrValue: EventLocationType["type"],
  eventLocations: LocationObject[]
) => {
  let bookingLocation = bookingLocationTypeOrValue;
  eventLocations.forEach((location) => {
    if (location.type === bookingLocationTypeOrValue) {
      const eventLocationType = getEventLocationType(bookingLocationTypeOrValue);
      if (!eventLocationType) {
        return;
      }
      if (!eventLocationType.default && eventLocationType.linkType === "dynamic") {
        // Dynamic link based locations should still be saved as type. The beyond logic generates meeting URL based on the type.
        // This difference can be avoided when we start storing both type and value of a location
        return;
      }

      bookingLocation = location[eventLocationType.defaultValueVariable] || bookingLocation;
    }
  });
  return bookingLocation;
};

export const getEventLocationValue = (eventLocations: LocationObject[], bookingLocation: LocationObject) => {
  const eventLocationType = getEventLocationType(bookingLocation?.type);
  if (!eventLocationType) {
    return "";
  }
  const defaultValueVariable = eventLocationType.defaultValueVariable;
  if (!defaultValueVariable) {
    console.error(`${defaultValueVariable} not set for ${bookingLocation.type}`);
    return "";
  }
  const eventLocation = getEventLocationWithType(eventLocations, bookingLocation?.type);
  if (!eventLocation) {
    console.error(`Could not find eventLocation for ${bookingLocation}`);
    return "";
  }

  // Must send .type here if value isn't available due to privacy setting.
  // For Booker Phone Number, it would be a value always. For others, value is either autogenerated or provided by Organizer and thus it's possible that organizer doesn't want it to show
  // Backend checks for `integration` to generate link
  // TODO: use zodSchema to ensure the type of data is correct
  return (
    bookingLocation[defaultValueVariable] || eventLocation[defaultValueVariable] || eventLocationType.type
  );
};

export function getSuccessPageLocationMessage(
  location: EventLocationType["type"],
  t: TFunction,
  bookingStatus?: BookingStatus
) {
  const eventLocationType = getEventLocationType(location);
  let locationToDisplay = location;
  if (eventLocationType && !eventLocationType.default && eventLocationType.linkType === "dynamic") {
    const isConfirmed = bookingStatus === BookingStatus.ACCEPTED;

    if (bookingStatus === BookingStatus.CANCELLED || bookingStatus === BookingStatus.REJECTED) {
      locationToDisplay == t("web_conference");
    } else if (isConfirmed) {
      locationToDisplay =
        getHumanReadableLocationValue(location, t) + ": " + t("meeting_url_in_conformation_email");
    } else {
      locationToDisplay = t("web_conferencing_details_to_follow");
    }
  }
  return locationToDisplay;
}
