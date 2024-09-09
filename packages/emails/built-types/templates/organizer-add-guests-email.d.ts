import OrganizerScheduledEmail from "./organizer-scheduled-email";
export default class OrganizerAddGuestsEmail extends OrganizerScheduledEmail {
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=organizer-add-guests-email.d.ts.map