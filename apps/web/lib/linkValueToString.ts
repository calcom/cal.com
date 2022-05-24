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
      return t("cal_provide_google_meet_location");
    case LocationType.Zoom:
      return t("cal_provide_zoom_meeting_url");
    case LocationType.Daily:
      return t("cal_provide_video_meeting_url");
    case LocationType.Jitsi:
      return t("cal_provide_jitsi_meeting_url");
    case LocationType.Huddle01:
      return t("cal_provide_huddle01_meeting_url");
    case LocationType.Tandem:
      return t("cal_provide_tandem_meeting_url");
    case LocationType.Teams:
      return t("cal_provide_teams_meeting_url");
    default:
      return linkValue || "";
  }
};
