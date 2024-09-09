import type { CalendarEvent } from "@calcom/types/Calendar";
import OrganizerScheduledEmail from "./organizer-scheduled-email";
export default class AttendeeWasRequestedToRescheduleEmail extends OrganizerScheduledEmail {
    private metadata;
    constructor(calEvent: CalendarEvent, metadata: {
        rescheduleLink: string;
    });
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getWhen(): string;
    protected getTextBody(): string;
}
//# sourceMappingURL=attendee-was-requested-to-reschedule-email.d.ts.map