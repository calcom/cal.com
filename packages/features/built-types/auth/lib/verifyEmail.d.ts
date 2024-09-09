interface VerifyEmailType {
    username?: string;
    email: string;
    language?: string;
    secondaryEmailId?: number;
    isVerifyingEmail?: boolean;
    isPlatform?: boolean;
}
export declare const sendEmailVerification: ({ email, language, username, secondaryEmailId, isPlatform, }: VerifyEmailType) => Promise<{
    ok: boolean;
    skipped: boolean;
}>;
export declare const sendEmailVerificationByCode: ({ email, language, username, isVerifyingEmail, }: VerifyEmailType) => Promise<{
    ok: boolean;
    skipped: boolean;
}>;
interface ChangeOfEmail {
    user: {
        username: string;
        emailFrom: string;
        emailTo: string;
    };
    language?: string;
}
export declare const sendChangeOfEmailVerification: ({ user, language }: ChangeOfEmail) => Promise<{
    ok: boolean;
    skipped: boolean;
}>;
export {};
//# sourceMappingURL=verifyEmail.d.ts.map