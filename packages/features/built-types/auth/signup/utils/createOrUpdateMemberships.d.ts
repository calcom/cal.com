import type { Team, User, OrganizationSettings } from "@calcom/prisma/client";
export declare const createOrUpdateMemberships: ({ user, team, }: {
    user: Pick<User, "id">;
    team: Pick<Team, "id" | "parentId" | "isOrganization"> & {
        organizationSettings: OrganizationSettings | null;
    };
}) => Promise<{
    membership: {
        id: number;
        role: import(".prisma/client").$Enums.MembershipRole;
        disableImpersonation: boolean;
        userId: number;
        teamId: number;
        accepted: boolean;
    };
    orgMembership: null;
}>;
//# sourceMappingURL=createOrUpdateMemberships.d.ts.map