import { z } from "zod";
export declare const ZIntegrationsInputSchema: z.ZodObject<{
    variant: z.ZodOptional<z.ZodString>;
    exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    onlyInstalled: z.ZodOptional<z.ZodBoolean>;
    includeTeamInstalledApps: z.ZodOptional<z.ZodBoolean>;
    extendsFeature: z.ZodOptional<z.ZodLiteral<"EventType">>;
    teamId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodNull]>>;
    sortByMostPopular: z.ZodOptional<z.ZodBoolean>;
    categories: z.ZodOptional<z.ZodArray<z.ZodNativeEnum<{
        readonly calendar: "calendar";
        readonly messaging: "messaging";
        readonly other: "other";
        readonly payment: "payment";
        readonly video: "video";
        readonly web3: "web3";
        readonly automation: "automation";
        readonly analytics: "analytics";
        readonly conferencing: "conferencing";
        readonly crm: "crm";
    }>, "many">>;
    appId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    variant?: string | undefined;
    exclude?: string[] | undefined;
    onlyInstalled?: boolean | undefined;
    includeTeamInstalledApps?: boolean | undefined;
    extendsFeature?: "EventType" | undefined;
    teamId?: number | null | undefined;
    sortByMostPopular?: boolean | undefined;
    categories?: ("calendar" | "messaging" | "other" | "payment" | "video" | "web3" | "automation" | "analytics" | "conferencing" | "crm")[] | undefined;
    appId?: string | undefined;
}, {
    variant?: string | undefined;
    exclude?: string[] | undefined;
    onlyInstalled?: boolean | undefined;
    includeTeamInstalledApps?: boolean | undefined;
    extendsFeature?: "EventType" | undefined;
    teamId?: number | null | undefined;
    sortByMostPopular?: boolean | undefined;
    categories?: ("calendar" | "messaging" | "other" | "payment" | "video" | "web3" | "automation" | "analytics" | "conferencing" | "crm")[] | undefined;
    appId?: string | undefined;
}>;
export type TIntegrationsInputSchema = z.infer<typeof ZIntegrationsInputSchema>;
