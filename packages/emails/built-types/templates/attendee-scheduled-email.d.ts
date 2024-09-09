import type { TFunction } from "next-i18next";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import BaseEmail from "./_base-email";
export default class AttendeeScheduledEmail extends BaseEmail {
    calEvent: CalendarEvent;
    attendee: Person;
    showAttendees: boolean | undefined;
    t: TFunction;
    constructor(calEvent: CalendarEvent, attendee: Person, showAttendees?: boolean | undefined);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getTextBody(title?: string, subtitle?: string): string;
    protected getTimezone(): string;
    protected getLocale(): string;
    protected getInviteeStart(format: string): string;
    protected getInviteeEnd(format: string): string;
    getFormattedDate(): string;
}
//# sourceMappingURL=attendee-scheduled-email.d.ts.map