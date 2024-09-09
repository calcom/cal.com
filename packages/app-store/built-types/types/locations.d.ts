import type { TFunction } from "next-i18next";
import { BookingStatus } from "@calcom/prisma/enums";
import type { Ensure, Optional } from "@calcom/types/utils";
import type { EventLocationTypeFromAppMeta } from "../types/App";
export type DefaultEventLocationType = {
    default: true;
    type: DefaultEventLocationTypeEnum;
    label: string;
    messageForOrganizer: string;
    category: "in person" | "conferencing" | "other" | "phone";
    iconUrl: string;
    urlRegExp?: string;
    variable: "locationType" | "locationAddress" | "address" | "locationLink" | "locationPhoneNumber" | "phone" | "hostDefault";
    defaultValueVariable: "address" | "attendeeAddress" | "link" | "hostPhoneNumber" | "hostDefault" | "phone" | "somewhereElse";
} & ({
    organizerInputType: "phone" | "text" | null;
    organizerInputPlaceholder?: string | null;
    attendeeInputType?: null;
    attendeeInputPlaceholder?: null;
} | {
    attendeeInputType: "phone" | "attendeeAddress" | "somewhereElse" | null;
    attendeeInputPlaceholder: string;
    organizerInputType?: null;
    organizerInputPlaceholder?: null;
});
export type EventLocationTypeFromApp = Ensure<EventLocationTypeFromAppMeta, "defaultValueVariable" | "variable">;
export type EventLocationType = DefaultEventLocationType | EventLocationTypeFromApp;
export declare const DailyLocationType = "integrations:daily";
export declare const MeetLocationType = "integrations:google:meet";
/**
 * This isn't an actual location app type. It is a special value that informs to use the Organizer's default conferencing app during booking
 */
export declare const OrganizerDefaultConferencingAppType = "conferencing";
export declare enum DefaultEventLocationTypeEnum {
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
    Conferencing = "conferencing",
    SomewhereElse = "somewhereElse"
}
export declare const defaultLocations: DefaultEventLocationType[];
export type LocationObject = {
    type: string;
    address?: string;
    displayLocationPublicly?: boolean;
    credentialId?: number;
} & Partial<Record<"address" | "attendeeAddress" | "link" | "hostPhoneNumber" | "hostDefault" | "phone" | "somewhereElse", string>>;
export type BookingLocationValue = string;
export declare const AppStoreLocationType: Record<string, string>;
export declare const getStaticLinkBasedLocation: (locationType: string) => EventLocationTypeFromApp | undefined;
export declare const getEventLocationTypeFromApp: (locationType: string) => EventLocationTypeFromApp | undefined;
export declare const getEventLocationType: (locationType: string | undefined | null) => DefaultEventLocationType | EventLocationTypeFromApp | undefined;
export declare const getEventLocationTypeFromValue: (value: string | undefined | null) => DefaultEventLocationType | EventLocationTypeFromApp | null | undefined;
export declare const guessEventLocationType: (locationTypeOrValue: string | undefined | null) => DefaultEventLocationType | EventLocationTypeFromApp | null | undefined;
export declare const LocationType: {
    AttendeeInPerson: DefaultEventLocationTypeEnum.AttendeeInPerson;
    InPerson: DefaultEventLocationTypeEnum.InPerson;
    Phone: DefaultEventLocationTypeEnum.Phone;
    UserPhone: DefaultEventLocationTypeEnum.UserPhone;
    Link: DefaultEventLocationTypeEnum.Link;
    Conferencing: DefaultEventLocationTypeEnum.Conferencing;
    SomewhereElse: DefaultEventLocationTypeEnum.SomewhereElse;
};
type PrivacyFilteredLocationObject = Optional<LocationObject, "address" | "link">;
export declare const privacyFilteredLocations: (locations: LocationObject[]) => PrivacyFilteredLocationObject[];
/**
 * Use this function for translating event location to a readable string
 * @param location
 * @param t
 * @returns string
 */
export declare const getMessageForOrganizer: (location: string, t: TFunction) => string;
/**
 * Use this function to translate booking location value to a readable string
 * @param linkValue
 * @param translationFunction
 * @returns
 */
export declare const getHumanReadableLocationValue: (linkValue: string | undefined | null, translationFunction: TFunction) => string;
export declare const locationKeyToString: (location: LocationObject) => string | null;
export declare const getEventLocationWithType: (locations: LocationObject[], locationType: EventLocationType["type"] | undefined) => LocationObject | undefined;
/**
 * It converts a static link based video location type(e.g. integrations:campfire_video) to it's value (e.g. https://campfire.to/my_link) set in the eventType.
 * If the type provided is already a value(when displayLocationPublicly is on), it would just return that.
 * For, dynamic link based video location apps, it doesn't do anything.
 */
export declare const getLocationValueForDB: (bookingLocationTypeOrValue: EventLocationType["type"], eventLocations: LocationObject[]) => {
    bookingLocation: string;
    conferenceCredentialId: undefined;
};
export declare const getEventLocationValue: (eventLocations: LocationObject[], bookingLocation: LocationObject) => string;
export declare function getSuccessPageLocationMessage(location: EventLocationType["type"], t: TFunction, bookingStatus?: BookingStatus): string;
export declare const getTranslatedLocation: (location: PrivacyFilteredLocationObject, eventLocationType: ReturnType<typeof getEventLocationType>, t: TFunction) => string | null;
export declare const getOrganizerInputLocationTypes: () => string[];
export {};
//# sourceMappingURL=locations.d.ts.map