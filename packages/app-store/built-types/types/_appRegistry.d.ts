import type { UserAdminTeams } from "@calcom/lib/server/repository/user";
import type { AppFrontendPayload as App } from "@calcom/types/App";
import type { CredentialFrontendPayload as Credential } from "@calcom/types/Credential";
export type TDependencyData = {
    name?: string;
    installed?: boolean;
}[];
/**
 * Get App metdata either using dirName or slug
 */
export declare function getAppWithMetadata(app: {
    dirName: string;
} | {
    slug: string;
}): Promise<{
    type: `${string}_other` | `${string}_calendar` | `${string}_messaging` | `${string}_payment` | `${string}_video` | `${string}_automation` | `${string}_analytics` | `${string}_crm` | `${string}_other_calendar`;
    price?: number | undefined;
    name: string;
    description: string;
    email: string;
    url: string;
    title?: string | undefined;
    createdAt?: string | undefined;
    paid?: import("@calcom/types/App").PaidAppData | undefined;
    rating?: number | undefined;
    slug: string;
    logo: string;
    verified?: boolean | undefined;
    dirName?: string | undefined;
    categories: import(".prisma/client").$Enums.AppCategories[];
    variant: "video" | "other" | "payment" | "calendar" | "automation" | "conferencing" | "crm" | "other_calendar";
    isTemplate?: boolean | undefined;
    installed?: boolean | undefined;
    category?: string | undefined;
    extendsFeature?: "EventType" | "User" | undefined;
    publisher: string;
    docsUrl?: string | undefined;
    trending?: boolean | undefined;
    reviews?: number | undefined;
    isGlobal?: boolean | undefined;
    simplePath?: string | undefined;
    feeType?: "monthly" | "usage-based" | "one-time" | "free" | undefined;
    commission?: number | undefined;
    licenseRequired?: boolean | undefined;
    teamsPlanRequired?: {
        upgradeUrl: string;
    } | undefined;
    appData?: import("@calcom/types/App").AppData | undefined;
    __template?: string | undefined;
    dependencies?: string[] | undefined;
    concurrentMeetings?: boolean | undefined;
    isOAuth?: boolean | undefined;
    isDefault?: boolean | undefined;
    dependencyData?: {
        name?: string | undefined;
        installed?: boolean | undefined;
    }[] | undefined;
    installCount?: number | undefined;
} | null>;
/** Mainly to use in listings for the frontend, use in getStaticProps or getServerSideProps */
export declare function getAppRegistry(): Promise<App[]>;
export declare function getAppRegistryWithCredentials(userId: number, userAdminTeams?: UserAdminTeams): Promise<(Omit<import("@calcom/types/App").App, "key"> & {
    isDefault?: boolean | undefined;
    key?: undefined;
    dependencyData?: {
        name?: string | undefined;
        installed?: boolean | undefined;
    }[] | undefined;
    installCount?: number | undefined;
} & {
    credentials: Credential[];
    isDefault?: boolean | undefined;
})[]>;
//# sourceMappingURL=_appRegistry.d.ts.map