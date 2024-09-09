import type { CalendarEvent } from "@calcom/types/Calendar";
import OrganizerScheduledEmail from "./organizer-scheduled-email";
export default class OrganizerRequestedToRescheduleEmail extends OrganizerScheduledEmail {
    private metadata;
    constructor(calEvent: CalendarEvent, metadata: {
        rescheduleLink: string;
    });
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getiCalEventAsString(): string | undefined;
    protected getTextBody(title?: string, subtitle?: string): string;
}
//# sourceMappingURL=organizer-requested-to-reschedule-email.d.ts.map