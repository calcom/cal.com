import OrganizerScheduledEmail from "./organizer-scheduled-email";
export default class OrganizerCancelledEmail extends OrganizerScheduledEmail {
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=organizer-cancelled-email.d.ts.map