import type { IdentityProvider } from "@calcom/prisma/enums";
type createUsersAndConnectToOrgPropsType = {
    emailsToCreate: string[];
    organizationId: number;
    identityProvider: IdentityProvider;
    identityProviderId: string | null;
};
declare const createUsersAndConnectToOrg: (createUsersAndConnectToOrgProps: createUsersAndConnectToOrgPropsType) => Promise<{
    id: number;
    email: string;
    organizationId: number | null;
    password: {
        hash: string;
    } | null;
    username: string | null;
    locale: string | null;
    profiles: {
        id: number;
        organizationId: number;
        userId: number;
        uid: string;
        username: string;
        createdAt: Date;
        updatedAt: Date;
    }[];
    completedOnboarding: boolean;
    identityProvider: import(".prisma/client").$Enums.IdentityProvider;
}[]>;
export default createUsersAndConnectToOrg;
//# sourceMappingURL=createUsersAndConnectToOrg.d.ts.map