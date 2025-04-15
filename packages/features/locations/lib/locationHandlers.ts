import {
  getLocationFromApp as getLocationFromAppOriginal,
  MeetLocationType,
  DailyLocationType,
  getEventLocationType,
  getTranslatedLocation,
  locationKeyToString,
  guessEventLocationType,
} from "@calcom/app-store/locations";

export const getLocationFromApp = getLocationFromAppOriginal;
export {
  MeetLocationType,
  DailyLocationType,
  getEventLocationType,
  getTranslatedLocation,
  locationKeyToString,
  guessEventLocationType,
};

export * from "@calcom/app-store/locations";
