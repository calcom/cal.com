import type { AppMeta } from "@calcom/types/App";

export const sanitizeAppsMetadata = <T extends object>(appsMetaData: T) => {
  const appsMap = Object.keys(appsMetaData).reduce((store, key) => {
    const metadata = appsMetaData[key as keyof T] as AppMeta;

    store[key] = metadata;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    delete store[key]["/*"];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    delete store[key]["__createdUsingCli"];
    return store;
  }, {} as Record<string, AppMeta>);

  return Object.values(appsMap);
};
