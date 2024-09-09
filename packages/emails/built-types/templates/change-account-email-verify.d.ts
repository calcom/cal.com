import type { TFunction } from "next-i18next";
import BaseEmail from "./_base-email";
export type ChangeOfEmailVerifyLink = {
    language: TFunction;
    user: {
        name?: string | null;
        emailFrom: string;
        emailTo: string;
    };
    verificationEmailLink: string;
};
export default class ChangeOfEmailVerifyEmail extends BaseEmail {
    changeEvent: ChangeOfEmailVerifyLink;
    constructor(changeEvent: ChangeOfEmailVerifyLink);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getTextBody(): string;
}
//# sourceMappingURL=change-account-email-verify.d.ts.map