/**
 * Default location types that are available alongside conferencing apps
 * These match the pattern from packages/app-store/locations.ts
 */

export enum DefaultLocationType {
  AttendeeInPerson = "attendeeInPerson",
  InPerson = "inPerson",
  Phone = "phone",
  UserPhone = "userPhone",
  Link = "link",
  Conferencing = "conferencing",
  SomewhereElse = "somewhereElse",
}

export type DefaultLocation = {
  type: DefaultLocationType;
  label: string;
  iconUrl: string;
  category: "in person" | "conferencing" | "other" | "phone";
};

/**
 * Default locations available in Cal.com
 * Icons are served from https://app.cal.com/{iconPath}
 */
export const defaultLocations: DefaultLocation[] = [
  {
    type: DefaultLocationType.AttendeeInPerson,
    label: "In Person (Attendee Address)",
    iconUrl: "https://app.cal.com/map-pin-dark.svg",
    category: "in person",
  },
  {
    type: DefaultLocationType.SomewhereElse,
    label: "Custom Attendee Location",
    iconUrl: "https://app.cal.com/message-pin.svg",
    category: "other",
  },
  {
    type: DefaultLocationType.InPerson,
    label: "In Person (Organizer Address)",
    iconUrl: "https://app.cal.com/map-pin-dark.svg",
    category: "in person",
  },
  {
    type: DefaultLocationType.Link,
    label: "Link Meeting",
    iconUrl: "https://app.cal.com/link.svg",
    category: "other",
  },
  {
    type: DefaultLocationType.Phone,
    label: "Attendee Phone Number",
    iconUrl: "https://app.cal.com/phone.svg",
    category: "phone",
  },
  {
    type: DefaultLocationType.UserPhone,
    label: "Organizer Phone Number",
    iconUrl: "https://app.cal.com/phone.svg",
    category: "phone",
  },
];

/**
 * Get icon URL for a default location type
 */
export function getDefaultLocationIconUrl(locationType: string): string | null {
  const location = defaultLocations.find((loc) => loc.type === locationType);
  return location ? location.iconUrl : null;
}

/**
 * Check if a location type is a default location (not a conferencing app)
 */
export function isDefaultLocation(locationType: string): boolean {
  return defaultLocations.some((loc) => loc.type === locationType);
}

