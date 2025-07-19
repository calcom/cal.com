import type { Calendar } from "@calcom/types/Calendar";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";
import type { CRM } from "@calcom/types/CrmService";

import { getCalendar } from "../_utils/getCalendar";
import { getCrm } from "../_utils/getCrm";
import type { IAppStore, ICalendarService, ICrmService, IVideoService } from "./IAppStore";

class ProductionCalendarService implements ICalendarService {
  async getService(credential: CredentialForCalendarService): Promise<Calendar | null> {
    return getCalendar(credential);
  }
}

class ProductionCrmService implements ICrmService {
  async getService(credential: CredentialPayload, appOptions: any): Promise<CRM | null> {
    return getCrm(credential, appOptions);
  }
}

class ProductionVideoService implements IVideoService {
  async getService(credential: CredentialPayload): Promise<any> {
    throw new Error("Video service not yet implemented in production app store");
  }
}

export class ProductionAppStore implements IAppStore {
  calendar = new ProductionCalendarService();
  crm = new ProductionCrmService();
  video = new ProductionVideoService();
}
