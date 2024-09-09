import type { TFunction } from "next-i18next";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import BaseEmail from "./_base-email";
export default class OrganizerScheduledEmail extends BaseEmail {
    calEvent: CalendarEvent;
    t: TFunction;
    newSeat?: boolean;
    teamMember?: Person;
    constructor(input: {
        calEvent: CalendarEvent;
        newSeat?: boolean;
        teamMember?: Person;
    });
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getTextBody(title?: string, subtitle?: string, extraInfo?: string, callToAction?: string): string;
    protected getTimezone(): string;
    protected getLocale(): string;
    protected getOrganizerStart(format: string): string;
    protected getOrganizerEnd(format: string): string;
    protected getFormattedDate(): string;
}
//# sourceMappingURL=organizer-scheduled-email.d.ts.map