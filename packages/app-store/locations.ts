import type { TFunction } from "next-i18next";

import logger from "@calcom/lib/logger";
import { Optional } from "@calcom/types/utils";

import type { EventLocationTypeFromApp } from "../types/App";
import { appStoreMetadata } from "./apps.browser.generated";

export type DefaultEventLocationType = {
  default: true;
  type: DefaultEventLocationTypeEnum;
  label: string;
  organizerInput: boolean;
  messageForOrganizer: string;

  iconUrl: string;

  // HACK: `variable` and `defaultValueVariable` are required due to legacy reason where different locations were stored in different places.
  variable: "locationType" | "locationAddress" | "locationLink" | "locationPhoneNumber" | "phone";
  defaultValueVariable: "address" | "link" | "hostPhoneNumber" | "phone";
} & (
  | {
      organizerInputType: "phone" | "text" | null;
      organizerInputPlaceholder?: string | null;
      attendeeInputType?: null;
      attendeeInputPlaceholder?: null;
    }
  | {
      attendeeInputType: "phone" | "text" | null;
      attendeeInputPlaceholder: string;
      organizerInputType?: null;
      organizerInputPlaceholder?: null;
    }
);

export type EventLocationType = DefaultEventLocationType | EventLocationTypeFromApp;
export const DailyLocationType = "integrations:daily";
export enum DefaultEventLocationTypeEnum {
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
    type: DefaultEventLocationTypeEnum.InPerson,
    label: "In Person",
    organizerInputType: "text",
    organizerInput: true,
    messageForOrganizer: "Provide an Address or Place",
    // HACK:
    variable: "locationAddress",
    defaultValueVariable: "address",
    iconUrl: "/map-pin.svg",
  },
  {
    default: true,
    type: DefaultEventLocationTypeEnum.Link,
    label: "Link",
    organizerInputType: "text",
    organizerInput: true,
    variable: "locationLink",
    messageForOrganizer: "Provide a Meeting Link",
    defaultValueVariable: "link",
    iconUrl: "/globe.svg",
  },
  {
    default: true,
    type: DefaultEventLocationTypeEnum.Phone,
    label: "Attendee Phone Number",
    organizerInput: false,
    variable: "phone",
    organizerInputType: null,
    attendeeInputType: "phone",
    attendeeInputPlaceholder: `t("enter_phone_number")`,
    defaultValueVariable: "phone",
    messageForOrganizer: "Cal will ask your invitee to enter a phone number before scheduling.",
    // This isn't inputType phone because organizer doesn't need to provide it.
    // inputType: "phone"
    iconUrl: "/phone.svg",
  },
  {
    default: true,
    type: DefaultEventLocationTypeEnum.UserPhone,
    label: "Organizer Phone Number",
    organizerInput: true,
    messageForOrganizer: "Provide your phone number",
    organizerInputType: "phone",
    variable: "locationPhoneNumber",
    defaultValueVariable: "hostPhoneNumber",
    iconUrl: "/phone.svg",
  },
];

export type LocationObject = {
  type: string;
  displayLocationPublicly?: boolean;
} & Partial<Record<"address" | "link" | "hostPhoneNumber" | "phone", string>>;

// integrations:jitsi | 919999999999 | Delhi | https://manual.meeting.link | Around Video
export type BookingLocationValue = string;

export const AppStoreLocationType: Record<string, string> = {};

const locationsFromApps: EventLocationTypeFromApp[] = [];

for (const [appName, meta] of Object.entries(appStoreMetadata)) {
  const location = meta.appData?.location;
  if (location) {
    // location.organizerInput = typeof location.organizerInput === "undefined" ? true : false;
    location.messageForOrganizer = location.messageForOrganizer || `Set ${location.label} link`;
    location.iconUrl = meta.logo;
    // For All event location apps, locationLink is where we store the input
    // TODO: locationLink and link seems redundant. We can modify the code to keep just one of them.
    location.variable = location.variable || "locationLink";
    location.defaultValueVariable = location.defaultValueVariable || "link";

    // Static links always require organizer to input
    if (location.linkType === "static") {
      location.organizerInputType = location.organizerInputType || "text";
    } else {
      location.organizerInputType = null;
    }

    AppStoreLocationType[appName] = location.type;

    locationsFromApps.push({
      ...location,
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
    if (!l.default && l.linkType === "static") {
      return new RegExp(l.urlRegExp).test(value);
    }
  });
};

export const guessEventLocationType = (locationTypeOrValue: string | undefined | null) =>
  getEventLocationType(locationTypeOrValue) || getEventLocationTypeFromValue(locationTypeOrValue);

export const LocationType = { ...DefaultEventLocationTypeEnum, ...AppStoreLocationType };

type PrivacyFilteredLocationObject = Optional<LocationObject, "address" | "link">;

export const privacyFilteredLocations = (locations: LocationObject[]): PrivacyFilteredLocationObject[] => {
  const locationsAfterPrivacyFilter = locations.map((location) => {
    const eventLocationType = getEventLocationType(location["type"]);
    // Filter out locations that are not to be displayed publicly
    // Display if the location can be set to public - and also display all locations like google meet etc
    if (location.displayLocationPublicly || !eventLocationType) return location;
    else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { address: _1, link: _2, ...privacyFilteredLocation } = location;
      return privacyFilteredLocation;
    }
  });
  logger.debug("Privacy filtered locations", locations, locationsAfterPrivacyFilter);
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
    return defaultLocation.messageForOrganizer;
  }
  if (videoLocation && videoLocation.linkType !== "static") {
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
    console.error(`Could not find location for type ${location.type}`);
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

export const getEventLocationValue = (
  locations: LocationObject[],
  locationType: EventLocationType["type"] | undefined
) => {
  const eventLocationType = getEventLocationType(locationType);
  if (!eventLocationType) {
    console.error(`Could not find location for type ${locationType}`);
    return "";
  }
  const defaultValueVariable = eventLocationType.defaultValueVariable;
  if (!defaultValueVariable) {
    console.error(`${defaultValueVariable} not set for ${locationType}`);
    return "";
  }
  const eventLocation = getEventLocationWithType(locations, locationType);
  if (!eventLocation) {
    console.error(`Could not find eventLocation for ${locationType}`);
    return "";
  }
  // Must send .type here for dynamic link based locations(which are video locations)
  // Backend checks for `integration` to generate link
  // TODO: use zodSchema to ensure the type of data is correct
  return eventLocation[defaultValueVariable] || eventLocationType.type;
};
