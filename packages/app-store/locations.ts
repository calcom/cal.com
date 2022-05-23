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
