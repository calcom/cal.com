import type { TFunction } from "next-i18next";
import type { CalendarEvent } from "@calcom/types/Calendar";
import BaseEmail from "./_base-email";
export default class BrokenIntegrationEmail extends BaseEmail {
    type: "calendar" | "video";
    calEvent: CalendarEvent;
    t: TFunction;
    constructor(calEvent: CalendarEvent, type: "calendar" | "video");
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getTextBody(title?: string, subtitle?: string, extraInfo?: string, callToAction?: string): string;
    protected getTimezone(): string;
    protected getLocale(): string;
    protected getOrganizerStart(format: string): string;
    protected getOrganizerEnd(format: string): string;
    protected getFormattedDate(): string;
}
//# sourceMappingURL=broken-integration-email.d.ts.map