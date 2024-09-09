import AttendeeScheduledEmail from "./attendee-scheduled-email";
export default class AttendeeCancelledSeatEmail extends AttendeeScheduledEmail {
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=attendee-cancelled-seat-email.d.ts.map