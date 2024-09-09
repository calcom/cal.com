import AttendeeScheduledEmail from "./attendee-scheduled-email";
export default class AttendeeDeclinedEmail extends AttendeeScheduledEmail {
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=attendee-declined-email.d.ts.map