/// <reference types="react" />
import type { TFunction } from "next-i18next";
import { BaseEmailHtml } from "../components";
export type PasswordReset = {
    language: TFunction;
    user: {
        name?: string | null;
        email: string;
    };
    resetLink: string;
};
export declare const ForgotPasswordEmail: (props: PasswordReset & Partial<React.ComponentProps<typeof BaseEmailHtml>>) => JSX.Element;
//# sourceMappingURL=ForgotPasswordEmail.d.ts.map