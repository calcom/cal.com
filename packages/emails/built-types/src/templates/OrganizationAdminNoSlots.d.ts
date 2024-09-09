/// <reference types="react" />
import type { TFunction } from "next-i18next";
import { BaseEmailHtml } from "../components";
export type OrganizationAdminNoSlotsEmailInput = {
    language: TFunction;
    to: {
        email: string;
    };
    user: string;
    slug: string;
    startTime: string;
    editLink: string;
};
export declare const OrganizationAdminNoSlotsEmail: (props: OrganizationAdminNoSlotsEmailInput & Partial<React.ComponentProps<typeof BaseEmailHtml>>) => JSX.Element;
//# sourceMappingURL=OrganizationAdminNoSlots.d.ts.map