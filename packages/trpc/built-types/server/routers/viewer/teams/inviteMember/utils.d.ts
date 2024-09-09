import type { TFunction } from "next-i18next";
import type { Membership, OrganizationSettings, Team } from "@calcom/prisma/client";
import { type User as UserType, type UserPassword, Prisma } from "@calcom/prisma/client";
import type { Profile as ProfileType } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TeamWithParent } from "./types";
export type Invitee = Pick<UserType, "id" | "email" | "username" | "identityProvider" | "completedOnboarding">;
export type UserWithMembership = Invitee & {
    teams?: Pick<Membership, "userId" | "teamId" | "accepted" | "role">[];
    profiles: ProfileType[];
    password: UserPassword | null;
};
export type Invitation = {
    usernameOrEmail: string;
    role: MembershipRole;
};
type InvitableExistingUser = UserWithMembership & {
    newRole: MembershipRole;
};
type InvitableExistingUserWithProfile = InvitableExistingUser & {
    profile: {
        username: string;
    } | null;
};
export declare function ensureAtleastAdminPermissions({ userId, teamId, isOrg, }: {
    userId: number;
    teamId: number;
    isOrg?: boolean;
}): Promise<void>;
export declare function checkInputEmailIsValid(email: string): void;
export declare function getTeamOrThrow(teamId: number): Promise<{
    metadata: {
        requestedSlug?: string | null | undefined;
        paymentId?: string | undefined;
        subscriptionId?: string | null | undefined;
        subscriptionItemId?: string | null | undefined;
        orgSeats?: number | null | undefined;
        orgPricePerSeat?: number | null | undefined;
        migratedToOrgFrom?: {
            teamSlug?: string | null | undefined;
            lastMigrationTime?: string | undefined;
            reverted?: boolean | undefined;
            lastRevertTime?: string | undefined;
        } | undefined;
        billingPeriod?: import("@calcom/prisma/zod-utils").BillingPeriod | undefined;
    } | null;
    organizationSettings: {
        id: number;
        organizationId: number;
        isOrganizationConfigured: boolean;
        isOrganizationVerified: boolean;
        orgAutoAcceptEmail: string;
        lockEventTypeCreationForUsers: boolean;
        adminGetsNoSlotsNotification: boolean;
        isAdminReviewed: boolean;
        isAdminAPIEnabled: boolean;
    } | null;
    parent: ({
        organizationSettings: {
            id: number;
            organizationId: number;
            isOrganizationConfigured: boolean;
            isOrganizationVerified: boolean;
            orgAutoAcceptEmail: string;
            lockEventTypeCreationForUsers: boolean;
            adminGetsNoSlotsNotification: boolean;
            isAdminReviewed: boolean;
            isAdminAPIEnabled: boolean;
        } | null;
    } & {
        name: string;
        id: number;
        createdAt: Date;
        metadata: Prisma.JsonValue;
        timeZone: string;
        slug: string | null;
        parentId: number | null;
        logoUrl: string | null;
        calVideoLogo: string | null;
        appLogo: string | null;
        appIconLogo: string | null;
        bio: string | null;
        hideBranding: boolean;
        isPrivate: boolean;
        hideBookATeamMember: boolean;
        theme: string | null;
        brandColor: string | null;
        darkBrandColor: string | null;
        bannerUrl: string | null;
        timeFormat: number | null;
        weekStart: string;
        isOrganization: boolean;
        pendingPayment: boolean;
        isPlatform: boolean;
        createdByOAuthClientId: string | null;
        smsLockState: import(".prisma/client").$Enums.SMSLockState;
        smsLockReviewedByAdmin: boolean;
    }) | null;
    name: string;
    id: number;
    createdAt: Date;
    timeZone: string;
    slug: string | null;
    parentId: number | null;
    logoUrl: string | null;
    calVideoLogo: string | null;
    appLogo: string | null;
    appIconLogo: string | null;
    bio: string | null;
    hideBranding: boolean;
    isPrivate: boolean;
    hideBookATeamMember: boolean;
    theme: string | null;
    brandColor: string | null;
    darkBrandColor: string | null;
    bannerUrl: string | null;
    timeFormat: number | null;
    weekStart: string;
    isOrganization: boolean;
    pendingPayment: boolean;
    isPlatform: boolean;
    createdByOAuthClientId: string | null;
    smsLockState: import(".prisma/client").$Enums.SMSLockState;
    smsLockReviewedByAdmin: boolean;
}>;
export declare function getUniqueInvitationsOrThrowIfEmpty(invitations: Invitation[]): Promise<Invitation[]>;
export declare const enum INVITE_STATUS {
    USER_PENDING_MEMBER_OF_THE_ORG = "USER_PENDING_MEMBER_OF_THE_ORG",
    USER_ALREADY_INVITED_OR_MEMBER = "USER_ALREADY_INVITED_OR_MEMBER",
    USER_MEMBER_OF_OTHER_ORGANIZATION = "USER_MEMBER_OF_OTHER_ORGANIZATION",
    CAN_BE_INVITED = "CAN_BE_INVITED"
}
export declare function canBeInvited(invitee: UserWithMembership, team: TeamWithParent): INVITE_STATUS;
export declare function findUsersWithInviteStatus({ invitations, team, }: {
    invitations: Invitation[];
    team: TeamWithParent;
}): Promise<{
    newRole: MembershipRole;
    canBeInvited: INVITE_STATUS;
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
export declare function getOrgConnectionInfo({ orgAutoAcceptDomain, orgVerified, isOrg, email, team, }: {
    orgAutoAcceptDomain?: string | null;
    orgVerified: boolean | null;
    email: string;
    team: Pick<TeamWithParent, "parentId" | "id">;
    isOrg: boolean;
}): {
    orgId: number | undefined;
    autoAccept: boolean;
};
export declare function createNewUsersConnectToOrgIfExists({ invitations, isOrg, teamId, parentId, autoAcceptEmailDomain, orgConnectInfoByUsernameOrEmail, isPlatformManaged, timeFormat, weekStart, timeZone, }: {
    invitations: Invitation[];
    isOrg: boolean;
    teamId: number;
    parentId?: number | null;
    autoAcceptEmailDomain: string | null;
    orgConnectInfoByUsernameOrEmail: Record<string, ReturnType<typeof getOrgConnectionInfo>>;
    isPlatformManaged?: boolean;
    timeFormat?: number;
    weekStart?: string;
    timeZone?: string;
}): Promise<{
    name: string | null;
    id: number;
    startTime: number;
    endTime: number;
    metadata: Prisma.JsonValue;
    email: string;
    timeZone: string;
    locale: string | null;
    bio: string | null;
    hideBranding: boolean;
    theme: string | null;
    brandColor: string | null;
    darkBrandColor: string | null;
    timeFormat: number | null;
    weekStart: string;
    smsLockState: import(".prisma/client").$Enums.SMSLockState;
    smsLockReviewedByAdmin: boolean;
    organizationId: number | null;
    username: string | null;
    emailVerified: Date | null;
    avatarUrl: string | null;
    bufferTime: number;
    appTheme: string | null;
    createdDate: Date;
    trialEndsAt: Date | null;
    defaultScheduleId: number | null;
    completedOnboarding: boolean;
    twoFactorSecret: string | null;
    twoFactorEnabled: boolean;
    backupCodes: string | null;
    identityProvider: import(".prisma/client").$Enums.IdentityProvider;
    identityProviderId: string | null;
    invitedTo: number | null;
    allowDynamicBooking: boolean | null;
    allowSEOIndexing: boolean | null;
    receiveMonthlyDigestEmail: boolean | null;
    verified: boolean | null;
    role: import(".prisma/client").$Enums.UserPermissionRole;
    disableImpersonation: boolean;
    locked: boolean;
    movedToProfileId: number | null;
    isPlatformManaged: boolean;
}[]>;
export declare function createMemberships({ teamId, language, invitees, parentId, accepted, }: {
    teamId: number;
    language: string;
    invitees: (InvitableExistingUser & {
        needToCreateOrgMembership: boolean | null;
    })[];
    parentId: number | null;
    accepted: boolean;
}): Promise<void>;
export declare function sendSignupToOrganizationEmail({ usernameOrEmail, team, translation, inviterName, teamId, isOrg, }: {
    usernameOrEmail: string;
    team: {
        name: string;
        parent: {
            name: string;
        } | null;
    };
    translation: TFunction;
    inviterName: string;
    teamId: number;
    isOrg: boolean;
}): Promise<void>;
type TeamAndOrganizationSettings = Team & {
    organizationSettings?: OrganizationSettings | null;
};
export declare function getOrgState(isOrg: boolean, team: TeamAndOrganizationSettings & {
    parent: TeamAndOrganizationSettings | null;
}): {
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
};
export declare function getAutoJoinStatus({ team, invitee, connectionInfoMap, }: {
    team: TeamWithParent;
    invitee: UserWithMembership;
    connectionInfoMap: Record<string, ReturnType<typeof getOrgConnectionInfo>>;
}): {
    autoAccept: boolean;
    needToCreateProfile: null;
    needToCreateOrgMembership: null;
} | {
    autoAccept: boolean | undefined;
    needToCreateProfile: boolean;
    needToCreateOrgMembership: boolean;
};
export declare const groupUsersByJoinability: ({ existingUsersWithMemberships, team, connectionInfoMap, }: {
    team: TeamWithParent;
    existingUsersWithMemberships: InvitableExistingUserWithProfile[];
    connectionInfoMap: Record<string, ReturnType<typeof getOrgConnectionInfo>>;
}) => ({
    autoAccept: boolean;
    needToCreateProfile: null;
    needToCreateOrgMembership: null;
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
    profiles: ProfileType[];
    password: UserPassword | null;
    newRole: MembershipRole;
    profile: {
        username: string;
    } | null;
} | {
    autoAccept: boolean | undefined;
    needToCreateProfile: boolean;
    needToCreateOrgMembership: boolean;
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
    profiles: ProfileType[];
    password: UserPassword | null;
    newRole: MembershipRole;
    profile: {
        username: string;
    } | null;
})[][];
export declare const sendEmails: (emailPromises: Promise<void>[]) => Promise<void>;
export declare const sendExistingUserTeamInviteEmails: ({ existingUsersWithMemberships, language, currentUserTeamName, currentUserName, currentUserParentTeamName, isOrg, teamId, isAutoJoin, orgSlug, }: {
    language: TFunction;
    isAutoJoin: boolean;
    existingUsersWithMemberships: Omit<InvitableExistingUserWithProfile, "canBeInvited" | "newRole">[];
    currentUserTeamName?: string | undefined;
    currentUserParentTeamName: string | undefined;
    currentUserName?: string | null | undefined;
    isOrg: boolean;
    teamId: number;
    orgSlug: string | null;
}) => Promise<void>;
export declare function handleExistingUsersInvites({ invitableExistingUsers, team, orgConnectInfoByUsernameOrEmail, teamId, language, inviter, orgSlug, isOrg, }: {
    invitableExistingUsers: InvitableExistingUser[];
    team: TeamWithParent;
    orgConnectInfoByUsernameOrEmail: Record<string, {
        orgId: number | undefined;
        autoAccept: boolean;
    }>;
    teamId: number;
    language: string;
    inviter: {
        name: string | null;
    };
    isOrg: boolean;
    orgSlug: string | null;
}): Promise<void>;
export declare function handleNewUsersInvites({ invitationsForNewUsers, team, orgConnectInfoByUsernameOrEmail, teamId, language, isOrg, autoAcceptEmailDomain, inviter, }: {
    invitationsForNewUsers: Invitation[];
    teamId: number;
    language: string;
    orgConnectInfoByUsernameOrEmail: Record<string, {
        orgId: number | undefined;
        autoAccept: boolean;
    }>;
    autoAcceptEmailDomain: string | null;
    team: TeamWithParent;
    inviter: {
        name: string | null;
    };
    isOrg: boolean;
}): Promise<void>;
export {};
