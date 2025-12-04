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
  organizerInputType?: "text" | "phone" | null;
  organizerInputPlaceholder?: string;
  organizerInputLabel?: string;
  messageForOrganizer?: string;
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
    organizerInputType: "text",
    organizerInputPlaceholder: "Enter address or place",
    organizerInputLabel: "Address",
    messageForOrganizer: "Provide an Address or Place",
  },
  {
    type: DefaultLocationType.Link,
    label: "Link Meeting",
    iconUrl: "https://app.cal.com/link.svg",
    category: "other",
    organizerInputType: "text",
    organizerInputPlaceholder: "https://meet.example.com/join/123456",
    organizerInputLabel: "Meeting Link",
    messageForOrganizer: "Provide a Meeting Link",
  },
  {
    type: DefaultLocationType.Phone,
    label: "Attendee Phone Number",
    iconUrl: "https://app.cal.com/phone.svg",
    category: "phone",
    organizerInputType: null,
    messageForOrganizer: "Cal will ask your invitee to enter a phone number before scheduling.",
  },
  {
    type: DefaultLocationType.UserPhone,
    label: "Organizer Phone Number",
    iconUrl: "https://app.cal.com/phone.svg",
    category: "phone",
    organizerInputType: "phone",
    organizerInputPlaceholder: "Enter phone number",
    organizerInputLabel: "Phone Number",
    messageForOrganizer: "Provide your phone number with country code",
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
