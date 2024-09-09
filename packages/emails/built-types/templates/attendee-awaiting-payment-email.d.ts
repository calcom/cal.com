import AttendeeScheduledEmail from "./attendee-scheduled-email";
export default class AttendeeAwaitingPaymentEmail extends AttendeeScheduledEmail {
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=attendee-awaiting-payment-email.d.ts.map