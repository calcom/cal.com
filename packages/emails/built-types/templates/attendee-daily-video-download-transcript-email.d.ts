import type { TFunction } from "next-i18next";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import BaseEmail from "./_base-email";
export default class AttendeeDailyVideoDownloadTranscriptEmail extends BaseEmail {
    calEvent: CalendarEvent;
    attendee: Person;
    transcriptDownloadLinks: Array<string>;
    t: TFunction;
    constructor(calEvent: CalendarEvent, attendee: Person, transcriptDownloadLinks: string[]);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getTimezone(): string;
    protected getLocale(): string;
    protected getInviteeStart(format: string): string;
    protected getInviteeEnd(format: string): string;
    protected getFormattedDate(): string;
}
//# sourceMappingURL=attendee-daily-video-download-transcript-email.d.ts.map