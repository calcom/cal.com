import type { Team, OrganizationSettings } from "@calcom/prisma/client";
export declare function joinAnyChildTeamOnOrgInvite({ userId, org, }: {
    userId: number;
    org: Pick<Team, "id"> & {
        organizationSettings: OrganizationSettings | null;
    };
}): Promise<void>;
//# sourceMappingURL=organization.d.ts.map