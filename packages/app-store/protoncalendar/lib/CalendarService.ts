import type { Calendar } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import { ICSFeedCalendarService } from "../../ics-feedcalendar/lib/CalendarService";

const PROTON_CALENDAR_HOSTNAMES = ["proton.me", "protonmail.com"];

class ProtonCalendarService extends ICSFeedCalendarService {
  constructor(credential: CredentialPayload) {
    super(credential, {
      integrationName: "proton_calendar",
      allowedHostnames: PROTON_CALENDAR_HOSTNAMES,
      defaultCalendarName: "Proton Calendar",
      requireHttps: true,
    });
  }
}

export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new ProtonCalendarService(credential);
}
