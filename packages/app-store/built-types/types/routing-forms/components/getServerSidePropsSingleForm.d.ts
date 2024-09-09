import type { AppGetServerSidePropsContext, AppPrisma, AppUser } from "@calcom/types/AppGetServerSideProps";
export declare const getServerSidePropsForSingleFormView: (context: AppGetServerSidePropsContext, prisma: AppPrisma, user: AppUser, ssrInit: ssrInit) => Promise<{
    redirect: {
        permanent: boolean;
        destination: string;
    };
    readonly notFound?: undefined;
    props?: undefined;
} | {
    notFound: boolean;
    redirect?: undefined;
    props?: undefined;
} | {
    props: {
        trpcState: any;
        form: import("../types/types").SerializableForm<{
            team: {
                slug: string | null;
                name: string;
            } | null;
            _count: {
                responses: number;
            };
            id: string;
            name: string;
            description: string | null;
            routes: import(".prisma/client").Prisma.JsonValue;
            fields: import(".prisma/client").Prisma.JsonValue;
            position: number;
            disabled: boolean;
            userId: number;
            createdAt: Date;
            updatedAt: Date;
            teamId: number | null;
            settings: import(".prisma/client").Prisma.JsonValue;
        }>;
        enrichedWithUserProfileForm: import("../types/types").SerializableForm<{
            user: {
                id: number;
                metadata: import(".prisma/client").Prisma.JsonValue;
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
                name: string;
                metadata: import(".prisma/client").Prisma.JsonValue;
                parent: {
                    slug: string | null;
                } | null;
                slug: string | null;
                parentId: number | null;
            } | null;
            _count: {
                responses: number;
            };
            id: string;
            name: string;
            description: string | null;
            routes: import(".prisma/client").Prisma.JsonValue;
            fields: import(".prisma/client").Prisma.JsonValue;
            position: number;
            disabled: boolean;
            userId: number;
            createdAt: Date;
            updatedAt: Date;
            teamId: number | null;
            settings: import(".prisma/client").Prisma.JsonValue;
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
    redirect?: undefined;
    readonly notFound?: undefined;
}>;
//# sourceMappingURL=getServerSidePropsSingleForm.d.ts.map