import BaseCalendarService from "@calcom/lib/CalendarService";
import type { ICalendarServiceDependencies } from "@calcom/lib/di/interfaces/ICalendarServiceDependencies";
import type { CredentialPayload } from "@calcom/types/Credential";

export default class AppleCalendarService extends BaseCalendarService {
  constructor(credential: CredentialPayload, dependencies: ICalendarServiceDependencies) {
    super(credential, "apple_calendar", dependencies, "https://caldav.icloud.com");
  }
}
