import BaseCalendarService from "@calcom/lib/CalendarService";
import type { ICalendarServiceDependencies } from "@calcom/lib/di/interfaces/ICalendarServiceDependencies";
import type { CredentialPayload } from "@calcom/types/Credential";

export default class CalDavCalendarService extends BaseCalendarService {
  constructor(credential: CredentialPayload, dependencies: ICalendarServiceDependencies) {
    super(credential, "caldav_calendar", dependencies);
  }
}
