import AttendeeScheduledEmail from "./attendee-scheduled-email";
export default class AttendeeRescheduledEmail extends AttendeeScheduledEmail {
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=attendee-rescheduled-email.d.ts.map