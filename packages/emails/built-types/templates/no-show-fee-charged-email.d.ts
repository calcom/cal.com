import AttendeeScheduledEmail from "./attendee-scheduled-email";
export default class NoShowFeeChargedEmail extends AttendeeScheduledEmail {
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=no-show-fee-charged-email.d.ts.map