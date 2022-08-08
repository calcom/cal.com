import type { TFunction } from "next-i18next";

export enum DefaultLocationType {
  InPerson = "inPerson",
  Phone = "phone",
  UserPhone = "userPhone",
  Link = "link",
}

/** If your App has a location option, add it here */
export enum AppStoreLocationType {
  GoogleMeet = "integrations:google:meet",
  Zoom = "integrations:zoom",
  Daily = "integrations:daily",
  Jitsi = "integrations:jitsi",
  Huddle01 = "integrations:huddle01",
  Tandem = "integrations:tandem",
  Teams = "integrations:office365_video",
  Whereby = "integrations:whereby_video",
  Around = "integrations:around_video",
  Riverside = "integrations:riverside_video",
  Ping = "integrations:ping_video",
}

export type LocationObject = {
  type: LocationType;
  address?: string;
  link?: string;
  displayLocationPublicly?: boolean;
  hostPhoneNumber?: string;
};

export const LocationType = { ...DefaultLocationType, ...AppStoreLocationType };
export type LocationType = DefaultLocationType | AppStoreLocationType;

export const locationHiddenFilter = (locations: LocationObject[]) =>
  locations.filter((el) => {
    // Filter out locations that are not to be displayed publicly
    const values = Object.values(AppStoreLocationType);
    // Display if the location can be set to public - and also display all locations like google meet etc
    if (el.displayLocationPublicly || values.includes(el["type"] as unknown as AppStoreLocationType))
      return el;
    else {
      delete el.address;
      delete el.link;
      return el;
    }
  });

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
