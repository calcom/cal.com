import type { EventResult } from "@calcom/types/EventManager";

export class BookingReferenceService {
  static buildFromResult(result: EventResult<unknown>) {
    return {
      type: result.type,
      uid: result.uid,
      meetingId: result.uid,
      meetingPassword: result.originalEvent.attendees?.[0]?.timeZone || "",
      meetingUrl: result.originalEvent.videoCallData?.url || "",
      externalCalendarId: result.externalId || null,
      credentialId: result.credentialId || null,
    };
  }
}
