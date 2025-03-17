// If you import this file on any app it should produce circular dependency
// import appStore from "./index";
import type { EventLocationType } from "@calcom/app-store/locations";
import logger from "@calcom/lib/logger";
import { getPiiFreeCredential } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { App, AppMeta } from "@calcom/types/App";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

export type LocationOption = {
  label: string;
  value: EventLocationType["type"];
  icon?: string;
  disabled?: boolean;
};

export type CredentialDataWithTeamName = CredentialForCalendarService & {
  team?: {
    name: string;
  } | null;
};

export class AppStoreMetadataRepository {
  private appsList: AppMeta[];
  private appsMap: Record<string, AppMeta>[];

  async buildAllAppsMap(): Record<string, AppMeta>[] {
    if (!this.appsMap) {
      const { appStoreMetadata } = await import("@calcom/app-store/appStoreMetaData");

      this.appsMap = Object.keys(appStoreMetadata).reduce((store, key) => {
        const metadata = appStoreMetadata[key as keyof typeof appStoreMetadata] as AppMeta;

        store[key] = metadata;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        delete store[key]["/*"];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        delete store[key]["__createdUsingCli"];
        return store;
      }, {} as Record<string, AppMeta>);
    }
  }

  async getValuesFromAllAppsMap(): AppMeta[] {
    if (!this.appsMap) await this.buildAllAppsMap();
    return Object.values(this.appsMap);
  }

  async getApps(
    credentials: CredentialDataWithTeamName[],
    filterOnCredentials?: boolean
  ): Promise<
    (App & {
      credential: CredentialDataWithTeamName;
      credentials: CredentialDataWithTeamName[];
      locationOption: LocationOption | null;
    })[]
  > {
    const allApps = await this.getValuesFromAllAppsMap();
    const apps = allApps.reduce((reducedArray, appMeta) => {
      const appCredentials = credentials.filter((credential) => credential.appId === appMeta.slug);

      if (filterOnCredentials && !appCredentials.length && !appMeta.isGlobal) return reducedArray;

      let locationOption: LocationOption | null = null;

      /** If the app is a globally installed one, let's inject it's key */
      if (appMeta.isGlobal) {
        const credential = {
          id: 0,
          type: appMeta.type,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          key: appMeta.key!,
          userId: 0,
          user: { email: "" },
          teamId: null,
          appId: appMeta.slug,
          invalid: false,
          delegatedTo: null,
          delegatedToId: null,
          team: {
            name: "Global",
          },
        };
        logger.debug(
          `${appMeta.type} is a global app, injecting credential`,
          safeStringify(getPiiFreeCredential(credential))
        );
        appCredentials.push(credential);
      }

      /** Check if app has location option AND add it if user has credentials for it */
      if (appCredentials.length > 0 && appMeta?.appData?.location) {
        locationOption = {
          value: appMeta.appData.location.type,
          label: appMeta.appData.location.label || "No label set",
          disabled: false,
        };
      }

      const credential: (typeof appCredentials)[number] | null = appCredentials[0] || null;

      reducedArray.push({
        ...appMeta,
        /**
         * @deprecated use `credentials`
         */
        credential,
        credentials: appCredentials,
        /** Option to display in `location` field while editing event types */
        locationOption,
      });

      return reducedArray;
    }, [] as (App & { credential: CredentialDataWithTeamName; credentials: CredentialDataWithTeamName[]; locationOption: LocationOption | null })[]);

    return apps;
  }

  async getLocalAppMetadata(): Promise<AppMeta[]> {
    return await this.getValuesFromAllAppsMap();
  }

  async getAppFromSlug(slug: string | undefined): Promise<AppMeta | undefined> {
    const allApps = await this.getValuesFromAllAppsMap();
    return allApps.find((app) => app.slug === slug);
  }

  async getAppFromLocationValue(type: string): Promise<AppMeta | undefined> {
    const allApps = await this.getValuesFromAllAppsMap();
    return allApps.find((app) => app?.appData?.location?.type === type);
  }
}
