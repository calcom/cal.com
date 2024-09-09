import type { appStoreMetadata as rawAppStoreMetadata } from "./apps.metadata.generated";
type RawAppStoreMetaData = typeof rawAppStoreMetadata;
export declare const getNormalizedAppMetadata: (appMeta: RawAppStoreMetaData[keyof RawAppStoreMetaData]) => Omit<import("@calcom/types/App").App, "dirName"> & {
    dirName: string;
};
export {};
//# sourceMappingURL=getNormalizedAppMetadata.d.ts.map