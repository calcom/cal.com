export declare const enrichFormWithMigrationData: <T extends {
    user: {
        movedToProfileId: number | null;
        metadata?: unknown;
        username: string | null;
        nonProfileUsername: string | null;
        profile: {
            organization: {
                slug: string | null;
            } | null;
        };
    };
    team: {
        parent: {
            slug: string | null;
        } | null;
        metadata?: unknown;
    } | null;
}>(form: T) => T & {
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
};
//# sourceMappingURL=enrichFormWithMigrationData.d.ts.map