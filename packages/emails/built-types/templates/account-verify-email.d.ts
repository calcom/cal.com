import type { TFunction } from "next-i18next";
import BaseEmail from "./_base-email";
export type EmailVerifyLink = {
    language: TFunction;
    user: {
        name?: string | null;
        email: string;
    };
    verificationEmailLink: string;
    isSecondaryEmailVerification?: boolean;
};
export default class AccountVerifyEmail extends BaseEmail {
    verifyAccountInput: EmailVerifyLink;
    constructor(passwordEvent: EmailVerifyLink);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getTextBody(): string;
}
//# sourceMappingURL=account-verify-email.d.ts.map