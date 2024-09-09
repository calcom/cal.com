import type { Prisma } from "@calcom/prisma/client";
import type { AppGetServerSidePropsContext, AppPrisma } from "@calcom/types/AppGetServerSideProps";
export declare function isAuthorizedToViewTheForm({ user, currentOrgDomain, }: {
    user: {
        username: string | null;
        metadata: Prisma.JsonValue;
        movedToProfileId: number | null;
        profile: {
            organization: {
                slug: string | null;
                requestedSlug: string | null;
            } | null;
        };
        id: number;
    };
    currentOrgDomain: string | null;
}): Promise<boolean>;
export declare const getServerSideProps: (context: AppGetServerSidePropsContext, prisma: AppPrisma) => Promise<{
    notFound: boolean;
    props?: undefined;
} | {
    props: {
        isEmbed: boolean;
        themeBasis: string | null;
        profile: {
            theme: string | null;
            brandColor: string | null;
            darkBrandColor: string | null;
        };
        form: import("../../types/types").SerializableForm<{
            user: {
                id: number;
                metadata: Prisma.JsonValue;
                theme: string | null;
                brandColor: string | null;
                darkBrandColor: string | null;
                organization: {
                    slug: string | null;
                } | null;
                username: string | null;
                movedToProfileId: number | null;
            } & {
                nonProfileUsername: string | null;
                profile: import("@calcom/types/UserProfile").UserProfile;
            };
            team: {
                metadata: Prisma.JsonValue;
                parent: {
                    slug: string | null;
                } | null;
                slug: string | null;
                parentId: number | null;
            } | null;
            id: string;
            name: string;
            description: string | null;
            routes: Prisma.JsonValue;
            fields: Prisma.JsonValue;
            position: number;
            disabled: boolean;
            userId: number;
            createdAt: Date;
            updatedAt: Date;
            teamId: number | null;
            settings: Prisma.JsonValue;
        } & {
            user: {
                metadata: {
                    proPaidForByTeamId?: number | undefined;
                    stripeCustomerId?: string | undefined;
                    vitalSettings?: {
                        connected?: boolean | undefined;
                        selectedParam?: string | undefined;
                        sleepValue?: number | undefined;
                    } | undefined;
                    isPremium?: boolean | undefined;
                    sessionTimeout?: number | undefined;
                    defaultConferencingApp?: {
                        appSlug?: string | undefined;
                        appLink?: string | undefined;
                    } | undefined;
                    defaultBookerLayouts?: {
                        enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
                        defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
                    } | null | undefined;
                    emailChangeWaitingForVerification?: string | undefined;
                    migratedToOrgFrom?: {
                        username?: string | null | undefined;
                        lastMigrationTime?: string | undefined;
                        reverted?: boolean | undefined;
                        revertTime?: string | undefined;
                    } | undefined;
                } | null;
                movedToProfileId: number | null;
                username: string | null;
                nonProfileUsername: string | null;
                profile: {
                    organization: {
                        slug: string | null;
                    } | null;
                };
            };
            team: {
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
                parent?: {
                    slug: string | null;
                } | null | undefined;
            };
            userOrigin: string;
            teamOrigin: string;
            nonOrgUsername: string | null;
            nonOrgTeamslug: string | null;
        }>;
    };
    readonly notFound?: undefined;
}>;
//# sourceMappingURL=getServerSideProps.d.ts.map