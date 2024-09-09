import AttendeeScheduledEmail from "./attendee-scheduled-email";
export default class AttendeeCancelledEmail extends AttendeeScheduledEmail {
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=attendee-cancelled-email.d.ts.map