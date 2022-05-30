import { TFunction } from "next-i18next";

import { LocationType } from "./location";

/**
 * Use this function to translate booking location value to a readable string
 * @param linkValue
 * @param translationFunction
 * @returns
 */
export const linkValueToString = (
  linkValue: string | undefined | null,
  translationFunction: TFunction
): string => {
  const t = translationFunction;
  if (!linkValue) {
    return translationFunction("no_location");
  }
  switch (linkValue) {
    case LocationType.InPerson:
      return t("in_person_meeting");
    case LocationType.UserPhone:
      return t("user_phone");
    case LocationType.GoogleMeet:
      return `Google Meet: ${t("meeting_url_in_conformation_email")}`;
    case LocationType.Zoom:
      return `Zoom: ${t("meeting_url_in_conformation_email")}`;
    case LocationType.Daily:
      return `Cal Video: ${t("meeting_url_in_conformation_email")}`;
    case LocationType.Jitsi:
      return `Jitsi: ${t("meeting_url_in_conformation_email")}`;
    case LocationType.Huddle01:
      return `Huddle01t: ${t("meeting_url_in_conformation_email")}`;
    case LocationType.Tandem:
      return `Tandem: ${t("meeting_url_in_conformation_email")}`;
    case LocationType.Teams:
      return `Teams: ${t("meeting_url_in_conformation_email")}`;
    default:
      return linkValue || "";
  }
};
