import type { TFunction } from "next-i18next";
import type { CalendarEvent } from "@calcom/types/Calendar";
import BaseEmail from "./_base-email";
export default class OrganizerDailyVideoDownloadRecordingEmail extends BaseEmail {
    calEvent: CalendarEvent;
    downloadLink: string;
    t: TFunction;
    constructor(calEvent: CalendarEvent, downloadLink: string);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getTimezone(): string;
    protected getOrganizerStart(format: string): string;
    protected getOrganizerEnd(format: string): string;
    protected getLocale(): string;
    protected getFormattedDate(): string;
}
//# sourceMappingURL=organizer-daily-video-download-recording-email.d.ts.map