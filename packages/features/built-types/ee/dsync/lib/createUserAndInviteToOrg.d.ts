import type { TFunction } from "next-i18next";
import type { getTeamOrThrow } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";
declare const createUserAndInviteToOrg: ({ userEmail, org, translation, }: {
    userEmail: string;
    org: Awaited<ReturnType<typeof getTeamOrThrow>>;
    translation: TFunction;
}) => Promise<void>;
export default createUserAndInviteToOrg;
//# sourceMappingURL=createUserAndInviteToOrg.d.ts.map