import type { AppMeta } from "@calcom/types/App";
import { appStoreMetadata as rawAppStoreMetadata } from "./apps.metadata.generated";
type RawAppStoreMetaData = typeof rawAppStoreMetadata;
type AppStoreMetaData = {
    [key in keyof RawAppStoreMetaData]: Omit<AppMeta, "dirName"> & {
        dirName: string;
    };
};
export declare const appStoreMetadata: AppStoreMetaData;
export {};
//# sourceMappingURL=appStoreMetaData.d.ts.map