import type { CommonProperties } from "./App";

export enum DefaultEventLocationTypeEnum {
  /**
   * Booker Address
   */
  AttendeeInPerson = "attendeeInPerson",
  /**
   * Organizer Address
   */
  InPerson = "inPerson",
  /**
   * Booker Phone
   */
  Phone = "phone",
  /**
   * Organizer Phone
   */
  UserPhone = "userPhone",
  Link = "link",
  // Same as `OrganizerDefaultConferencingAppType`
  Conferencing = "conferencing",
}

export type LocationDefaultValueVariable =
  | "address"
  | "attendeeAddress"
  | "link"
  | "hostPhoneNumber"
  | "hostDefault"
  | "phone";

export type LocationVariable =
  | "locationType"
  | "locationAddress"
  | "address"
  | "locationLink"
  | "locationPhoneNumber"
  | "phone"
  | "hostDefault";

export type DefaultEventLocationType = {
  default: true;
  type: DefaultEventLocationTypeEnum;
  label: string;
  messageForOrganizer: string;
  category: "in person" | "conferencing" | "other" | "phone";

  iconUrl: string;
  urlRegExp?: string;
  // HACK: `variable` and `defaultValueVariable` are required due to legacy reason where different locations were stored in different places.
  variable: LocationVariable;
  defaultValueVariable: LocationDefaultValueVariable;
} & (
  | {
      organizerInputType: "phone" | "text" | null;
      organizerInputPlaceholder?: string | null;
      attendeeInputType?: null;
      attendeeInputPlaceholder?: null;
    }
  | {
      attendeeInputType: "phone" | "attendeeAddress" | null;
      attendeeInputPlaceholder: string;
      organizerInputType?: null;
      organizerInputPlaceholder?: null;
    }
);

// export type EventLocationTypeFromApp = Ensure<
//   EventLocationTypeFromAppMeta,
//   "defaultValueVariable" | "variable"
// >;
type LinkType = "static" | "dynamic";

export type EventLocationType = (DefaultEventLocationType | EventLocationTypeFromAppMeta) & {
  linkType?: LinkType;
  variable: NonNullable<LocationVariable>;
  defaultValueVariable: NonNullable<LocationDefaultValueVariable>;
};

export type LocationObject = {
  type: string;
  address?: string;
  displayLocationPublicly?: boolean;
  credentialId?: number;
} & Partial<
  Record<"address" | "attendeeAddress" | "link" | "hostPhoneNumber" | "hostDefault" | "phone", string>
>;

export const DailyLocationType = "integrations:daily";

export const MeetLocationType = "integrations:google:meet";

/**
 * This isn't an actual location app type. It is a special value that informs to use the Organizer's default conferencing app during booking
 */
export const OrganizerDefaultConferencingAppType = "conferencing";

// integrations:jitsi | 919999999999 | Delhi | https://manual.meeting.link | Around Video
export type BookingLocationValue = string;

type StaticLinkBasedEventLocation = {
  linkType: "static";
  urlRegExp: string;
  organizerInputPlaceholder?: string;
  organizerInputType?: "text" | "phone";
} & CommonProperties;

type DynamicLinkBasedEventLocation = {
  linkType: "dynamic";
  urlRegExp?: null;
  organizerInputType?: null;
  organizerInputPlaceholder?: null;
} & CommonProperties;

export type EventLocationTypeFromAppMeta = StaticLinkBasedEventLocation | DynamicLinkBasedEventLocation;
