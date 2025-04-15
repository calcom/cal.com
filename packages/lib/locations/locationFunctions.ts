import type { TFunction } from "i18next";

import logger from "@calcom/lib/logger";
import { BookingStatus } from "@calcom/prisma/enums";

import { DailyLocationType } from "./constants";
import {
  defaultLocations,
  DefaultEventLocationTypeEnum,
  type EventLocationType,
  type LocationObject,
  type EventLocationTypeFromApp,
} from "./locationTypes";

const log = logger.getSubLogger({ prefix: ["locations"] });

const locationsFromApps: EventLocationTypeFromApp[] = [];

const locations = [...defaultLocations, ...locationsFromApps];

export const getLocationFromApp = (locationType: string) =>
  locationsFromApps.find((l) => l.type === locationType);

export const getEventLocationType = (locationType: string | undefined | null) =>
  locations.find((l) => l.type === locationType);

const getStaticLinkLocationByValue = (value: string | undefined | null) => {
  if (!value) {
    return null;
  }
  return locations.find((l) => {
    if (l.default || l.linkType == "dynamic" || !l.urlRegExp) {
      return;
    }
    return new RegExp(l.urlRegExp).test(value);
  });
};

export const guessEventLocationType = (locationTypeOrValue: string | undefined | null) =>
  getEventLocationType(locationTypeOrValue) || getStaticLinkLocationByValue(locationTypeOrValue);

export const LocationType = { ...DefaultEventLocationTypeEnum };

type PrivacyFilteredLocationObject = Partial<LocationObject> & Pick<LocationObject, "type">;

export const privacyFilteredLocations = (locations: LocationObject[]): PrivacyFilteredLocationObject[] => {
  const locationsAfterPrivacyFilter = locations.map((location) => {
    const eventLocationType = getEventLocationType(location.type);
    if (!eventLocationType) {
      log.debug(`Couldn't find location type. App might be uninstalled: ${location.type} `);
    }
    if (location.displayLocationPublicly || !eventLocationType) {
      return location;
    } else {
      const { address: _1, link: _2, hostPhoneNumber: _3, ...privacyFilteredLocation } = location;
      log.debug("Applied Privacy Filter", location, privacyFilteredLocation);
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
  const videoLocation = getLocationFromApp(location);
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

  const eventLocationType = getEventLocationType(linkValue);
  const isDefault = eventLocationType?.default;
  if (eventLocationType) {
    return isDefault ? translationFunction(eventLocationType.label) : `${eventLocationType.label}`;
  }
  return linkValue || "";
};

export const getEventLocationWithType = (
  locations: LocationObject[],
  locationType: EventLocationType["type"] | undefined
) => {
  const location = locations.find((location) => location.type === locationType);
  return location;
};

/**
 * It converts a static link based video location type(e.g. integrations:campfire_video) to it's value (e.g. https://campfire.to/my_link) set in the eventType.
 * If the type provided is already a value(when displayLocationPublicly is on), it would just return that.
 * For, dynamic link based video location apps, it doesn't do anything.
 */
export const getLocationValueForDB = (
  bookingLocationTypeOrValue: EventLocationType["type"],
  eventLocations: LocationObject[]
) => {
  let bookingLocation = bookingLocationTypeOrValue;
  let conferenceCredentialId = undefined;

  eventLocations.forEach((location) => {
    if (location.type === bookingLocationTypeOrValue) {
      const eventLocationType = getEventLocationType(bookingLocationTypeOrValue);
      conferenceCredentialId = location.credentialId;
      if (!eventLocationType) {
        return;
      }
      if (!eventLocationType.default && eventLocationType.linkType === "dynamic") {
        return;
      }

      bookingLocation = location[eventLocationType.defaultValueVariable] || bookingLocation;
    }
  });

  if (bookingLocation.trim().length === 0) {
    bookingLocation = DailyLocationType;
  }

  return { bookingLocation, conferenceCredentialId };
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
      locationToDisplay = `${getHumanReadableLocationValue(location, t)}: ${t(
        "meeting_url_in_confirmation_email"
      )}`;
    } else {
      locationToDisplay = t("web_conferencing_details_to_follow");
    }
  }
  return locationToDisplay;
}

export const getOrganizerInputLocationTypes = () => {
  const result: (DefaultEventLocationTypeEnum | string)[] = [];

  const organizerInputTypeLocations = locations.filter((location) => !!location.organizerInputType);
  organizerInputTypeLocations?.forEach((l) => result.push(l.type));

  return result;
};

export const isAttendeeInputRequired = (locationType: string) => {
  const location = locations.find((l) => l.type === locationType);
  if (!location) {
    return false;
  }
  return location.attendeeInputType;
};
