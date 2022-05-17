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
}

export const LocationType = { ...DefaultLocationType, ...AppStoreLocationType };
export type LocationType = DefaultLocationType | AppStoreLocationType;
