/// <reference types="react" />
import type { TFunction } from "next-i18next";
import { V2BaseEmailHtml } from "../components";
type TeamInvite = {
    language: TFunction;
    from: string;
    to: string;
    orgName: string;
    joinLink: string;
};
export declare const OrgAutoInviteEmail: (props: TeamInvite & Partial<React.ComponentProps<typeof V2BaseEmailHtml>>) => JSX.Element;
export {};
//# sourceMappingURL=OrgAutoInviteEmail.d.ts.map