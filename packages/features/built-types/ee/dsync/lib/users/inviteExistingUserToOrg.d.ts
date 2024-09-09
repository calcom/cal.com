import type { TFunction } from "next-i18next";
import type { UserWithMembership } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";
/**
 * This should only be used in a dsync context
 */
declare const inviteExistingUserToOrg: ({ user, org, translation, }: {
    user: UserWithMembership;
    org: {
        id: number;
        name: string;
        parent: {
            name: string;
        } | null;
    };
    translation: TFunction;
}) => Promise<UserWithMembership>;
export default inviteExistingUserToOrg;
//# sourceMappingURL=inviteExistingUserToOrg.d.ts.map