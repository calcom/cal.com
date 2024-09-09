export type UseCalendarsReturnType = ReturnType<typeof useCalendars>;
type UseCalendarsProps = {
    hasSession: boolean;
};
export declare const useCalendars: ({ hasSession }: UseCalendarsProps) => {
    overlayBusyDates: import("@calcom/types/Calendar").EventBusyDate[] | undefined;
    isOverlayCalendarEnabled: boolean;
    connectedCalendars: ({
        integration: import("@calcom/types/App").App & {
            credential: import("@calcom/app-store/utils").CredentialDataWithTeamName;
            credentials: import("@calcom/app-store/utils").CredentialDataWithTeamName[];
            locationOption: {
                label: string;
                value: string;
                icon?: string | undefined;
                disabled?: boolean | undefined;
            } | null;
        };
        credentialId: number;
        primary?: undefined;
        calendars?: undefined;
        error?: undefined;
    } | {
        integration: {
            installed?: boolean | undefined;
            type: `${string}_other` | `${string}_calendar` | `${string}_messaging` | `${string}_payment` | `${string}_video` | `${string}_automation` | `${string}_analytics` | `${string}_crm` | `${string}_other_calendar`;
            title?: string | undefined;
            name: string;
            description: string;
            variant: "video" | "other" | "payment" | "calendar" | "automation" | "conferencing" | "crm" | "other_calendar";
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
        };
        credentialId: number;
        primary: {
            readOnly: boolean;
            primary: true | null;
            isSelected: boolean;
            credentialId: number;
            name?: string | undefined;
            email?: string | undefined;
            primaryEmail?: string | undefined;
            integrationTitle?: string | undefined;
            userId?: number | undefined;
            integration?: string | undefined;
            externalId: string;
        };
        calendars: {
            readOnly: boolean;
            primary: true | null;
            isSelected: boolean;
            credentialId: number;
            name?: string | undefined;
            email?: string | undefined;
            primaryEmail?: string | undefined;
            integrationTitle?: string | undefined;
            userId?: number | undefined;
            integration?: string | undefined;
            externalId: string;
        }[];
        error?: undefined;
    } | {
        integration: {
            installed?: boolean | undefined;
            type: `${string}_other` | `${string}_calendar` | `${string}_messaging` | `${string}_payment` | `${string}_video` | `${string}_automation` | `${string}_analytics` | `${string}_crm` | `${string}_other_calendar`;
            title?: string | undefined;
            name: string;
            description: string;
            variant: "video" | "other" | "payment" | "calendar" | "automation" | "conferencing" | "crm" | "other_calendar";
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
        };
        credentialId: number;
        error: {
            message: string;
        };
        primary?: undefined;
        calendars?: undefined;
    })[];
    loadingConnectedCalendar: boolean;
    onToggleCalendar: () => void;
};
export {};
//# sourceMappingURL=useCalendars.d.ts.map