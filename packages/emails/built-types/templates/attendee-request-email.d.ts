import AttendeeScheduledEmail from "./attendee-scheduled-email";
export default class AttendeeRequestEmail extends AttendeeScheduledEmail {
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=attendee-request-email.d.ts.map