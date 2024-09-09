/// <reference types="react" />
import type { TFunction } from "next-i18next";
import { BaseEmailHtml } from "../components";
export type EmailVerifyLink = {
    language: TFunction;
    user: {
        name?: string | null;
        emailFrom: string;
        emailTo: string;
    };
    verificationEmailLink: string;
};
export declare const VerifyEmailChangeEmail: (props: EmailVerifyLink & Partial<React.ComponentProps<typeof BaseEmailHtml>>) => JSX.Element;
//# sourceMappingURL=VerifyEmailChangeEmail.d.ts.map