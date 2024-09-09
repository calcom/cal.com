import type { TFunction } from "next-i18next";
import BaseEmail from "./_base-email";
export type OrganizationNotification = {
    t: TFunction;
    instanceAdmins: {
        email: string;
    }[];
    ownerEmail: string;
    orgSlug: string;
    webappIPAddress: string;
};
export default class AdminOrganizationNotification extends BaseEmail {
    input: OrganizationNotification;
    constructor(input: OrganizationNotification);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getTextBody(): string;
}
//# sourceMappingURL=admin-organization-notification.d.ts.map