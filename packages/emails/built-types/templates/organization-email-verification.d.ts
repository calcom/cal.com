import type { TFunction } from "next-i18next";
import BaseEmail from "./_base-email";
export type OrganizationEmailVerify = {
    language: TFunction;
    user: {
        email: string;
    };
    code: string;
};
export default class OrganizationEmailVerification extends BaseEmail {
    orgVerifyInput: OrganizationEmailVerify;
    constructor(orgVerifyInput: OrganizationEmailVerify);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getTextBody(): string;
}
//# sourceMappingURL=organization-email-verification.d.ts.map