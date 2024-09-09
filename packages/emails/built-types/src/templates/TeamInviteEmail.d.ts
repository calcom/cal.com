/// <reference types="react" />
import type { TFunction } from "next-i18next";
import { V2BaseEmailHtml } from "../components";
type TeamInvite = {
    language: TFunction;
    from: string;
    to: string;
    teamName: string;
    joinLink: string;
    isCalcomMember: boolean;
    isAutoJoin: boolean;
    isOrg: boolean;
    parentTeamName: string | undefined;
    isExistingUserMovedToOrg: boolean;
    prevLink: string | null;
    newLink: string | null;
};
export declare const TeamInviteEmail: (props: TeamInvite & Partial<React.ComponentProps<typeof V2BaseEmailHtml>>) => JSX.Element;
export {};
//# sourceMappingURL=TeamInviteEmail.d.ts.map