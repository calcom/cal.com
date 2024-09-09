import type { TFunction } from "next-i18next";
import BaseEmail from "./_base-email";
export type TeamInvite = {
    language: TFunction;
    from: string;
    to: string;
    teamName: string;
    joinLink: string;
    isCalcomMember: boolean;
    /**
     * We ideally should have a separate email for auto-join(when a user is automatically accepted into a team/org), but we don't have one yet.
     */
    isAutoJoin: boolean;
    isOrg: boolean;
    parentTeamName: string | undefined;
    isExistingUserMovedToOrg: boolean;
    prevLink: string | null;
    newLink: string | null;
};
export declare function getTypeOfInvite(teamInviteEvent: TeamInvite): "TO_ORG" | "TO_SUBTEAM" | "TO_REGULAR_TEAM";
export declare const getSubject: (teamInviteEvent: TeamInvite) => string;
export default class TeamInviteEmail extends BaseEmail {
    teamInviteEvent: TeamInvite;
    constructor(teamInviteEvent: TeamInvite);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=team-invite-email.d.ts.map