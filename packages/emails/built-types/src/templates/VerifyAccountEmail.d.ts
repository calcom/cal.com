/// <reference types="react" />
import type { TFunction } from "next-i18next";
import { BaseEmailHtml } from "../components";
export type EmailVerifyLink = {
    language: TFunction;
    user: {
        name?: string | null;
        email: string;
    };
    verificationEmailLink: string;
};
export declare const VerifyAccountEmail: (props: EmailVerifyLink & Partial<React.ComponentProps<typeof BaseEmailHtml>>) => JSX.Element;
//# sourceMappingURL=VerifyAccountEmail.d.ts.map