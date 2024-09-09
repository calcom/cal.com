/// <reference types="react" />
import type { TFunction } from "next-i18next";
import { BaseEmailHtml } from "../components";
export type OrganizationEmailVerify = {
    language: TFunction;
    user: {
        email: string;
    };
    code: string;
};
export declare const OrganisationAccountVerifyEmail: (props: OrganizationEmailVerify & Partial<React.ComponentProps<typeof BaseEmailHtml>>) => JSX.Element;
//# sourceMappingURL=OrganizationAccountVerifyEmail.d.ts.map