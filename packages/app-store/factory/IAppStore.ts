import type { Calendar } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM } from "@calcom/types/CrmService";

export interface ICalendarService {
  getService(credential: CredentialForCalendarService): Promise<Calendar | null>;
}

export interface ICrmService {
  getService(credential: CredentialPayload, appOptions: any): Promise<CRM | null>;
}

export interface IVideoService {
  getService(credential: CredentialPayload): Promise<any>;
}

export interface IAppStore {
  calendar: ICalendarService;
  crm: ICrmService;
  video: IVideoService;
}
