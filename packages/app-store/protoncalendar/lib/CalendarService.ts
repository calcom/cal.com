import type { Calendar } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import { ICSFeedCalendarService } from "../../ics-feedcalendar/lib/CalendarService";

class ProtonCalendarService extends ICSFeedCalendarService {
  constructor(credential: CredentialPayload) {
    super(credential, "protoncalendar_calendar");
  }
}

export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new ProtonCalendarService(credential);
}
