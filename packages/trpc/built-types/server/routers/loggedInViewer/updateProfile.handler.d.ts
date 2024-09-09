import type { GetServerSidePropsContext, NextApiResponse } from "next";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import { type TUpdateProfileInputSchema } from "./updateProfile.schema";
type UpdateProfileOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        res?: NextApiResponse | GetServerSidePropsContext["res"];
    };
    input: TUpdateProfileInputSchema;
};
export declare const updateProfileHandler: ({ ctx, input }: UpdateProfileOptions) => Promise<{
    email: string | undefined;
    avatarUrl: string | null;
    hasEmailBeenChanged: boolean | "" | undefined;
    sendEmailVerification: boolean;
    username?: string | undefined;
    name?: string | undefined;
    bio?: string | undefined;
    timeZone?: string | undefined;
    weekStart?: string | undefined;
    hideBranding?: boolean | undefined;
    allowDynamicBooking?: boolean | undefined;
    allowSEOIndexing?: boolean | undefined;
    receiveMonthlyDigestEmail?: boolean | undefined;
    brandColor?: string | undefined;
    darkBrandColor?: string | undefined;
    theme?: string | null | undefined;
    appTheme?: string | null | undefined;
    completedOnboarding?: boolean | undefined;
    locale?: string | undefined;
    timeFormat?: number | undefined;
    disableImpersonation?: boolean | undefined;
    metadata?: {
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
    } | null | undefined;
    travelSchedules?: {
        timeZone: string;
        startDate: Date;
        id?: number | undefined;
        endDate?: Date | undefined;
    }[] | undefined;
    secondaryEmails?: {
        id: number;
        email: string;
        isDeleted: boolean;
    }[] | undefined;
}>;
export {};
