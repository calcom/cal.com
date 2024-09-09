import type { TFunction } from "next-i18next";
import BaseEmail from "./_base-email";
export type OrgAutoInvite = {
    language: TFunction;
    from: string;
    to: string;
    orgName: string;
    joinLink: string;
};
export default class OrgAutoJoinEmail extends BaseEmail {
    orgAutoInviteEvent: OrgAutoInvite;
    constructor(orgAutoInviteEvent: OrgAutoInvite);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=org-auto-join-invite.d.ts.map