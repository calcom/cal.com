import AttendeeScheduledEmail from "./attendee-scheduled-email";
export default class AttendeeAddGuestsEmail extends AttendeeScheduledEmail {
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=attendee-add-guests-email.d.ts.map