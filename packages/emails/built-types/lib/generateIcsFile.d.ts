import type { EventStatus } from "ics";
import type { TFunction } from "next-i18next";
import type { CalendarEvent } from "@calcom/types/Calendar";
export declare enum GenerateIcsRole {
    ATTENDEE = "attendee",
    ORGANIZER = "organizer"
}
export default function generateIcsFile({ calEvent, title, subtitle, role, status, t, isRequestReschedule, }: {
    calEvent: CalendarEvent;
    title: string;
    subtitle: string;
    role: GenerateIcsRole;
    status: EventStatus;
    t?: TFunction;
    isRequestReschedule?: boolean;
}): {
    filename: string;
    content: string | undefined;
    method: string;
} | null;
//# sourceMappingURL=generateIcsFile.d.ts.map