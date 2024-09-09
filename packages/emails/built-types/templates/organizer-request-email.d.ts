import OrganizerScheduledEmail from "./organizer-scheduled-email";
export default class OrganizerRequestEmail extends OrganizerScheduledEmail {
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getTextBody(title?: string): string;
}
//# sourceMappingURL=organizer-request-email.d.ts.map