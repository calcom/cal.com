import type { TFunction } from "next-i18next";
import BaseEmail from "./_base-email";
export type PasswordReset = {
    language: TFunction;
    user: {
        name?: string | null;
        email: string;
    };
    resetLink: string;
};
export default class ForgotPasswordEmail extends BaseEmail {
    passwordEvent: PasswordReset;
    constructor(passwordEvent: PasswordReset);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getTextBody(): string;
}
//# sourceMappingURL=forgot-password-email.d.ts.map