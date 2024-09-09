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
                name: string;
                id: number;
                createdAt: Date;
                metadata: import(".prisma/client").Prisma.JsonValue;
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
            }[];
        } & {
            name: string;
            id: number;
            createdAt: Date;
            metadata: import(".prisma/client").Prisma.JsonValue;
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
            name: string;
            id: number;
            createdAt: Date;
            metadata: import(".prisma/client").Prisma.JsonValue;
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
