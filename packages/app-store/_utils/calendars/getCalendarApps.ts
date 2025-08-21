import logger from "@calcom/lib/logger";
import { getPiiFreeCredential } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { App } from "@calcom/types/App";
import type { AppMeta } from "@calcom/types/App";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import type { EventLocationType } from "../../locations";
import { calendarAppsMetaData } from "./calendarAppsMetaData";

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

const CALENDAR_APPS_MAP = Object.keys(calendarAppsMetaData).reduce((store, key) => {
  const metadata = calendarAppsMetaData[key as keyof typeof calendarAppsMetaData] as AppMeta;

  store[key] = metadata;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  delete store[key]["/*"];
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  delete store[key]["__createdUsingCli"];
  return store;
}, {} as Record<string, AppMeta>);

const ALL_CALENDAR_APPS = Object.values(CALENDAR_APPS_MAP);

export const getCalendarApps = (credentials: CredentialDataWithTeamName[], filterOnCredentials?: boolean) => {
  const apps = ALL_CALENDAR_APPS.reduce((reducedArray, appMeta) => {
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
        delegationCredentialId: null,
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
};
