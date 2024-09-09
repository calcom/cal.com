import type { AppMeta } from "@calcom/types/App";
import { appStoreMetadata as rawBookerAppsMetadata } from "./bookerApps.metadata.generated";
type RawAppStoreMetaData = typeof rawBookerAppsMetadata;
type AppStoreMetaData = {
    [key in keyof RawAppStoreMetaData]: AppMeta;
};
export declare const appStoreMetadata: AppStoreMetaData;
export {};
//# sourceMappingURL=bookerAppsMetaData.d.ts.map