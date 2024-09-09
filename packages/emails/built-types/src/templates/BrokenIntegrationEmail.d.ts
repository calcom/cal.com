/// <reference types="react" />
import type { TFunction } from "next-i18next";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { BaseScheduledEmail } from "./BaseScheduledEmail";
export declare function getEnumKeyByEnumValue(myEnum: any, enumValue: number | string): string;
export declare const BrokenIntegrationEmail: (props: {
    calEvent: CalendarEvent;
    attendee: Person;
    type: "video" | "calendar";
} & Partial<{
    calEvent: CalendarEvent;
    attendee: Person;
    timeZone: string;
    includeAppsStatus?: boolean | undefined;
    t: TFunction;
    locale: string;
    timeFormat: import("@calcom/lib/timeFormat").TimeFormat | undefined;
    isOrganizer?: boolean | undefined;
} & Partial<{
    children: import("react").ReactNode;
    callToAction?: import("react").ReactNode;
    subject: string;
    title?: string | undefined;
    subtitle?: import("react").ReactNode;
    headerType?: import("../components/EmailSchedulingBodyHeader").BodyHeadType | undefined;
    hideLogo?: boolean | undefined;
}>>) => JSX.Element;
//# sourceMappingURL=BrokenIntegrationEmail.d.ts.map