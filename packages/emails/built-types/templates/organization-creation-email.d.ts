import type { TFunction } from "next-i18next";
import BaseEmail from "./_base-email";
export type OrganizationCreation = {
    language: TFunction;
    from: string;
    to: string;
    ownerNewUsername: string;
    ownerOldUsername: string | null;
    orgDomain: string;
    orgName: string;
    prevLink: string | null;
    newLink: string;
};
export default class OrganizationCreationEmail extends BaseEmail {
    organizationCreationEvent: OrganizationCreation;
    constructor(organizationCreationEvent: OrganizationCreation);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=organization-creation-email.d.ts.map