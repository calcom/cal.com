import type logger from "@calcom/lib/logger";
import type { EventResult, PartialReference } from "@calcom/types/EventManager";

interface Dependencies {
  logger: typeof logger;
}

export class BookingReferenceService {
  constructor(private readonly deps: Dependencies) {}

  mapToReferenceData(result: EventResult<unknown>) {
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

  isCalendarReference(reference: PartialReference): boolean {
    return reference.type.includes("_calendar");
  }

  filterNonCalendarReferences(references: PartialReference[]): PartialReference[] {
    return references.filter((ref) => !this.isCalendarReference(ref));
  }
}
