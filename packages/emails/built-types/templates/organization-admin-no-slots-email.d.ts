import type { TFunction } from "next-i18next";
import BaseEmail from "./_base-email";
export type OrganizationAdminNoSlotsEmailInput = {
    language: TFunction;
    to: {
        email: string;
    };
    user: string;
    slug: string;
    startTime: string;
    editLink: string;
};
export default class OrganizationAdminNoSlotsEmail extends BaseEmail {
    adminNoSlots: OrganizationAdminNoSlotsEmailInput;
    constructor(adminNoSlots: OrganizationAdminNoSlotsEmailInput);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getTextBody(): string;
}
//# sourceMappingURL=organization-admin-no-slots-email.d.ts.map