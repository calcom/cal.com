import type { AppCategories } from "@prisma/client";
import type { EventLocationType } from "@calcom/app-store/locations";
import type { App, AppMeta } from "@calcom/types/App";
import type { CredentialPayload } from "@calcom/types/Credential";
export * from "./_utils/getEventTypeAppData";
type LocationOption = {
    label: string;
    value: EventLocationType["type"];
    icon?: string;
    disabled?: boolean;
};
export type CredentialDataWithTeamName = CredentialPayload & {
    team?: {
        name: string;
    } | null;
};
export declare const ALL_APPS: App[];
/**
 * This should get all available apps to the user based on his saved
 * credentials, this should also get globally available apps.
 */
declare function getApps(credentials: CredentialDataWithTeamName[], filterOnCredentials?: boolean): (App & {
    credential: CredentialDataWithTeamName;
    credentials: CredentialDataWithTeamName[];
    locationOption: LocationOption | null;
})[];
export declare function getLocalAppMetadata(): App[];
export declare function hasIntegrationInstalled(type: App["type"]): boolean;
export declare function getAppName(name: string): string | null;
export declare function getAppType(name: string): string;
export declare function getAppFromSlug(slug: string | undefined): AppMeta | undefined;
export declare function getAppFromLocationValue(type: string): AppMeta | undefined;
/**
 *
 * @param appCategories - from app metadata
 * @param concurrentMeetings - from app metadata
 * @returns - true if app supports team install
 */
export declare function doesAppSupportTeamInstall({ appCategories, concurrentMeetings, isPaid, }: {
    appCategories: string[];
    concurrentMeetings: boolean | undefined;
    isPaid: boolean;
}): boolean;
export declare function isConferencing(appCategories: string[]): boolean;
export declare const defaultVideoAppCategories: AppCategories[];
export default getApps;
//# sourceMappingURL=utils.d.ts.map