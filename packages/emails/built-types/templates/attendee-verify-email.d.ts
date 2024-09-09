import type { TFunction } from "next-i18next";
import BaseEmail from "./_base-email";
export type EmailVerifyCode = {
    language: TFunction;
    user: {
        name?: string | null;
        email: string;
    };
    verificationEmailCode: string;
    isVerifyingEmail?: boolean;
};
export default class AttendeeVerifyEmail extends BaseEmail {
    verifyAccountInput: EmailVerifyCode;
    constructor(passwordEvent: EmailVerifyCode);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getTextBody(): string;
}
//# sourceMappingURL=attendee-verify-email.d.ts.map