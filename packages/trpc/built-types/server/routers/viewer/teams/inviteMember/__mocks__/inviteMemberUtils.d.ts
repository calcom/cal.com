import type { MembershipRole } from "@calcom/prisma/enums";
import type * as inviteMemberUtils from "../utils";
declare const inviteMemberUtilsMock: import("vitest-mock-extended").DeepMockProxy<typeof inviteMemberUtils>;
export declare const inviteMemberutilsScenarios: {
    checkPermissions: {
        fakePassed: () => any;
    };
    getTeamOrThrow: {
        fakeReturnTeam: (team: {
            id: number;
        } & Record<string, any>, forInput: {
            teamId: number;
        }) => {
            id: number;
            organizationSettings: null;
            parent: null;
            parentId: null;
        };
    };
    getOrgState: {
        /**
         * `getOrgState` completely generates the return value from input without using any outside variable like DB, etc.
         * So, it makes sense to let it use the actual implementation instead of mocking the output based on input
         */
        useActual: () => Promise<typeof inviteMemberUtils.getOrgState & import("vitest-mock-extended").CalledWithMock<{
            isInOrgScope: boolean;
            orgVerified: boolean;
            orgConfigured: boolean;
            autoAcceptEmailDomain: string;
            orgPublished: boolean;
        } | {
            isInOrgScope: boolean;
            orgVerified: null;
            autoAcceptEmailDomain: null;
            orgConfigured: null;
            orgPublished: null;
        }, [isOrg: boolean, team: {
            id: number;
            name: string;
            slug: string | null;
            logoUrl: string | null;
            calVideoLogo: string | null;
            appLogo: string | null;
            appIconLogo: string | null;
            bio: string | null;
            hideBranding: boolean;
            isPrivate: boolean;
            hideBookATeamMember: boolean;
            createdAt: Date;
            metadata: import(".prisma/client").Prisma.JsonValue;
            theme: string | null;
            brandColor: string | null;
            darkBrandColor: string | null;
            bannerUrl: string | null;
            parentId: number | null;
            timeFormat: number | null;
            timeZone: string;
            weekStart: string;
            isOrganization: boolean;
            pendingPayment: boolean;
            isPlatform: boolean;
            createdByOAuthClientId: string | null;
            smsLockState: import(".prisma/client").$Enums.SMSLockState;
            smsLockReviewedByAdmin: boolean;
        } & {
            organizationSettings?: {
                id: number;
                organizationId: number;
                isOrganizationConfigured: boolean;
                isOrganizationVerified: boolean;
                orgAutoAcceptEmail: string;
                lockEventTypeCreationForUsers: boolean;
                adminGetsNoSlotsNotification: boolean;
                isAdminReviewed: boolean;
                isAdminAPIEnabled: boolean;
            } | null | undefined;
        } & {
            parent: ({
                id: number;
                name: string;
                slug: string | null;
                logoUrl: string | null;
                calVideoLogo: string | null;
                appLogo: string | null;
                appIconLogo: string | null;
                bio: string | null;
                hideBranding: boolean;
                isPrivate: boolean;
                hideBookATeamMember: boolean;
                createdAt: Date;
                metadata: import(".prisma/client").Prisma.JsonValue;
                theme: string | null;
                brandColor: string | null;
                darkBrandColor: string | null;
                bannerUrl: string | null;
                parentId: number | null;
                timeFormat: number | null;
                timeZone: string;
                weekStart: string;
                isOrganization: boolean;
                pendingPayment: boolean;
                isPlatform: boolean;
                createdByOAuthClientId: string | null;
                smsLockState: import(".prisma/client").$Enums.SMSLockState;
                smsLockReviewedByAdmin: boolean;
            } & {
                organizationSettings?: {
                    id: number;
                    organizationId: number;
                    isOrganizationConfigured: boolean;
                    isOrganizationVerified: boolean;
                    orgAutoAcceptEmail: string;
                    lockEventTypeCreationForUsers: boolean;
                    adminGetsNoSlotsNotification: boolean;
                    isAdminReviewed: boolean;
                    isAdminAPIEnabled: boolean;
                } | null | undefined;
            }) | null;
        }]>>;
    };
    getUniqueInvitationsOrThrowIfEmpty: {
        useActual: () => Promise<typeof inviteMemberUtils.getUniqueInvitationsOrThrowIfEmpty & import("vitest-mock-extended").CalledWithMock<Promise<inviteMemberUtils.Invitation[]>, [invitations: inviteMemberUtils.Invitation[]]>>;
    };
    findUsersWithInviteStatus: {
        useAdvancedMock: (returnVal: Awaited<ReturnType<typeof inviteMemberUtilsMock.findUsersWithInviteStatus>>, forInput: {
            team: any;
            invitations: {
                usernameOrEmail: string;
                newRole?: MembershipRole;
            }[];
        }) => Promise<{
            newRole: MembershipRole;
            canBeInvited: inviteMemberUtils.INVITE_STATUS;
            id: number;
            email: string;
            username: string | null;
            completedOnboarding: boolean;
            identityProvider: import(".prisma/client").$Enums.IdentityProvider;
            teams?: Pick<{
                id: number;
                teamId: number;
                userId: number;
                accepted: boolean;
                role: import(".prisma/client").$Enums.MembershipRole;
                disableImpersonation: boolean;
            }, "userId" | "teamId" | "role" | "accepted">[] | undefined;
            profiles: {
                id: number;
                uid: string;
                userId: number;
                organizationId: number;
                username: string;
                createdAt: Date;
                updatedAt: Date;
            }[];
            password: {
                hash: string;
                userId: number;
            } | null;
        }[]>;
    };
    getOrgConnectionInfo: {
        useActual: () => Promise<typeof inviteMemberUtils.getOrgConnectionInfo & import("vitest-mock-extended").CalledWithMock<{
            orgId: number | undefined;
            autoAccept: boolean;
        }, [{
            orgAutoAcceptDomain?: string | null | undefined;
            orgVerified: boolean | null;
            email: string;
            team: Pick<import("../types").TeamWithParent, "id" | "parentId">;
            isOrg: boolean;
        }]>>;
    };
};
export declare const expects: {
    expectSignupEmailsToBeSent: ({ emails, team, inviterName, isOrg, teamId, }: {
        emails: string[];
        team: any[];
        inviterName: string;
        teamId: number;
        isOrg: boolean;
    }) => void;
};
export default inviteMemberUtilsMock;
