import { TFunction } from "next-i18next";

import { LocationType } from "./location";

/**
 * Use this function for translating event location to a readable string
 * @param location
 * @param t
 * @returns string
 */
export const LocationOptionsToString = (location: string, t: TFunction) => {
  switch (location) {
    case LocationType.InPerson:
      return t("set_address_place");
    case LocationType.Link:
      return t("set_link_meeting");
    case LocationType.Phone:
      return t("cal_invitee_phone_number_scheduling");
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
      return null;
  }
};
