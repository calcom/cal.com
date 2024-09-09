import AttendeeScheduledEmail from "./attendee-scheduled-email";
export default class AttendeeLocationChangeEmail extends AttendeeScheduledEmail {
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=attendee-location-change-email.d.ts.map