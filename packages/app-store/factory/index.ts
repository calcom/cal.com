import type { Calendar } from "@calcom/types/Calendar";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";
import type { CRM } from "@calcom/types/CrmService";

import { AppStoreFactory } from "./AppStoreFactory";

export { AppStoreFactory } from "./AppStoreFactory";
export { TestAppStore } from "./TestAppStore";
export { ProductionAppStore } from "./ProductionAppStore";
export type { IAppStore, ICalendarService, ICrmService, IVideoService } from "./IAppStore";
export type { TestCalendarConfig, TestCrmConfig, TestVideoConfig } from "./TestAppStore";

export async function getCalendarFromFactory(
  credential: CredentialForCalendarService
): Promise<Calendar | null> {
  const appStore = AppStoreFactory.getAppStore();
  return appStore.calendar.getService(credential);
}

export async function getCrmFromFactory(credential: CredentialPayload, appOptions: any): Promise<CRM | null> {
  const appStore = AppStoreFactory.getAppStore();
  return appStore.crm.getService(credential, appOptions);
}

export async function getVideoFromFactory(credential: CredentialPayload): Promise<any> {
  const appStore = AppStoreFactory.getAppStore();
  return appStore.video.getService(credential);
}
