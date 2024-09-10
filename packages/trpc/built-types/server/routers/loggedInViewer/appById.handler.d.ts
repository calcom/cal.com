import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TAppByIdInputSchema } from "./appById.schema";
type AppByIdOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TAppByIdInputSchema;
};
export declare const appByIdHandler: ({ ctx, input }: AppByIdOptions) => Promise<{
    installed?: boolean | undefined;
    type: `${string}_calendar` | `${string}_messaging` | `${string}_payment` | `${string}_video` | `${string}_other` | `${string}_automation` | `${string}_analytics` | `${string}_crm` | `${string}_other_calendar`;
    title?: string | undefined;
    name: string;
    description: string;
    variant: "other" | "payment" | "calendar" | "video" | "automation" | "conferencing" | "crm" | "other_calendar";
    slug: string;
    category?: string | undefined;
    categories: import(".prisma/client").$Enums.AppCategories[];
    extendsFeature?: "EventType" | "User" | undefined;
    logo: string;
    publisher: string;
    url: string;
    docsUrl?: string | undefined;
    verified?: boolean | undefined;
    trending?: boolean | undefined;
    rating?: number | undefined;
    reviews?: number | undefined;
    isGlobal?: boolean | undefined;
    simplePath?: string | undefined;
    email: string;
    key?: import(".prisma/client").Prisma.JsonValue | undefined;
    feeType?: "monthly" | "usage-based" | "one-time" | "free" | undefined;
    price?: number | undefined;
    commission?: number | undefined;
    licenseRequired?: boolean | undefined;
    teamsPlanRequired?: {
        upgradeUrl: string;
    } | undefined;
    appData?: import("@calcom/types/App").AppData | undefined;
    paid?: import("@calcom/types/App").PaidAppData | undefined;
    dirName?: string | undefined;
    isTemplate?: boolean | undefined;
    __template?: string | undefined;
    dependencies?: string[] | undefined;
    concurrentMeetings?: boolean | undefined;
    createdAt?: string | undefined;
    isOAuth?: boolean | undefined;
    locationOption: {
        label: string;
        value: string;
        icon?: string | undefined;
        disabled?: boolean | undefined;
    } | null;
    isInstalled: number;
}>;
export {};
