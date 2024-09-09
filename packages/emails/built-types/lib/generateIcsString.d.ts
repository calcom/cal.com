import type { EventStatus } from "ics";
import type { TFunction } from "next-i18next";
import type { CalendarEvent } from "@calcom/types/Calendar";
import { GenerateIcsRole } from "./generateIcsFile";
export declare enum BookingAction {
    Create = "create",
    Cancel = "cancel",
    Reschedule = "reschedule",
    RequestReschedule = "request_reschedule",
    LocationChange = "location_change"
}
declare const generateIcsString: ({ event, title, subtitle, status, role, isRequestReschedule, t, }: {
    event: CalendarEvent;
    title: string;
    subtitle: string;
    status: EventStatus;
    role: GenerateIcsRole;
    isRequestReschedule?: boolean | undefined;
    t?: TFunction | undefined;
}) => string | undefined;
export default generateIcsString;
//# sourceMappingURL=generateIcsString.d.ts.map