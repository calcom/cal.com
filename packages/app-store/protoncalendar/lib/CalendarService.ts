import type { Calendar } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import { ICSFeedCalendarService } from "../../ics-feedcalendar/lib/CalendarService";

export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new ICSFeedCalendarService(credential, "protoncalendar_calendar");
}
