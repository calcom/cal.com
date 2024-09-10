import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type Props = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const getUserTopBannersHandler: ({ ctx }: Props) => Promise<{
    teamUpgradeBanner: ({
        team: {
            children: {
                id: number;
                slug: string | null;
                parentId: number | null;
                timeZone: string;
                metadata: import(".prisma/client").Prisma.JsonValue;
                name: string;
                bio: string | null;
                weekStart: string;
                hideBranding: boolean;
                theme: string | null;
                timeFormat: number | null;
                brandColor: string | null;
                darkBrandColor: string | null;
                smsLockState: import(".prisma/client").$Enums.SMSLockState;
                smsLockReviewedByAdmin: boolean;
                createdAt: Date;
                logoUrl: string | null;
                calVideoLogo: string | null;
                appLogo: string | null;
                appIconLogo: string | null;
                isPrivate: boolean;
                hideBookATeamMember: boolean;
                bannerUrl: string | null;
                isOrganization: boolean;
                pendingPayment: boolean;
                isPlatform: boolean;
                createdByOAuthClientId: string | null;
            }[];
        } & {
            id: number;
            slug: string | null;
            parentId: number | null;
            timeZone: string;
            metadata: import(".prisma/client").Prisma.JsonValue;
            name: string;
            bio: string | null;
            weekStart: string;
            hideBranding: boolean;
            theme: string | null;
            timeFormat: number | null;
            brandColor: string | null;
            darkBrandColor: string | null;
            smsLockState: import(".prisma/client").$Enums.SMSLockState;
            smsLockReviewedByAdmin: boolean;
            createdAt: Date;
            logoUrl: string | null;
            calVideoLogo: string | null;
            appLogo: string | null;
            appIconLogo: string | null;
            isPrivate: boolean;
            hideBookATeamMember: boolean;
            bannerUrl: string | null;
            isOrganization: boolean;
            pendingPayment: boolean;
            isPlatform: boolean;
            createdByOAuthClientId: string | null;
        };
    } & {
        id: number;
        userId: number;
        teamId: number;
        role: import(".prisma/client").$Enums.MembershipRole;
        disableImpersonation: boolean;
        accepted: boolean;
    })[];
    orgUpgradeBanner: ({
        team: {
            id: number;
            slug: string | null;
            parentId: number | null;
            timeZone: string;
            metadata: import(".prisma/client").Prisma.JsonValue;
            name: string;
            bio: string | null;
            weekStart: string;
            hideBranding: boolean;
            theme: string | null;
            timeFormat: number | null;
            brandColor: string | null;
            darkBrandColor: string | null;
            smsLockState: import(".prisma/client").$Enums.SMSLockState;
            smsLockReviewedByAdmin: boolean;
            createdAt: Date;
            logoUrl: string | null;
            calVideoLogo: string | null;
            appLogo: string | null;
            appIconLogo: string | null;
            isPrivate: boolean;
            hideBookATeamMember: boolean;
            bannerUrl: string | null;
            isOrganization: boolean;
            pendingPayment: boolean;
            isPlatform: boolean;
            createdByOAuthClientId: string | null;
        };
    } & {
        id: number;
        userId: number;
        teamId: number;
        role: import(".prisma/client").$Enums.MembershipRole;
        disableImpersonation: boolean;
        accepted: boolean;
    })[];
    verifyEmailBanner: boolean;
    calendarCredentialBanner: boolean;
    invalidAppCredentialBanners: import("@calcom/features/users/components/InvalidAppCredentialsBanner").InvalidAppCredentialBannerProps[];
}>;
export {};
