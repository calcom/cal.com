export enum LocationType {
  InPerson = "inPerson",
  Phone = "phone",
  GoogleMeet = "integrations:google:meet",
  Zoom = "integrations:zoom",
}

export type EventTypeLocation = {
  type: `${LocationType}`;
  address?: string;
};
