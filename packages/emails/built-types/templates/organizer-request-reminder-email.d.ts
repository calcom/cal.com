import OrganizerRequestEmail from "./organizer-request-email";
export default class OrganizerRequestReminderEmail extends OrganizerRequestEmail {
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=organizer-request-reminder-email.d.ts.map