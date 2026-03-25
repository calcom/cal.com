import type { AdditionalInformation, EntryPoint } from "@calcom/types/Calendar";
import type { EventResult } from "@calcom/types/EventManager";

// type ConferenceEntryPoint = {
//   entryPointType?: string | null;
//   uri?: string | null;
// };

type EventWithConferenceFields = AdditionalInformation & {
  url?: string | null;
  entryPoints?: EntryPoint[] | null;
  conferenceData?: {
    entryPoints?: EntryPoint[] | null;
  } | null;
};

export type ResultWithConferenceFields = EventResult<EventWithConferenceFields>;

const getEventFromResult = (result?: ResultWithConferenceFields): EventWithConferenceFields | undefined => {
  if (!result) return undefined;
  if (Array.isArray(result.updatedEvent)) return result.updatedEvent[0];
  return result.updatedEvent ?? result.createdEvent;
};

const getVideoEntryPointUrl = (entryPoints?: ConferenceEntryPoint[] | null): string | undefined => {
  if (!entryPoints?.length) return undefined;
  return (
    entryPoints.find((entryPoint) => entryPoint?.entryPointType === "video" && !!entryPoint.uri)?.uri ||
    undefined
  );
};

export const getConferenceDetailsFromResult = (result?: ResultWithConferenceFields) => {
  const event = getEventFromResult(result);
  const conferenceData = event?.conferenceData;
  const entryPoints = event?.entryPoints ?? conferenceData?.entryPoints;
  const hangoutLink = event?.hangoutLink || getVideoEntryPointUrl(entryPoints);
  const meetingUrl = hangoutLink || event?.url || undefined;

  return {
    meetingUrl,
    hangoutLink,
    conferenceData,
    entryPoints,
  };
};

export const getPreferredConferenceResult = (results: ResultWithConferenceFields[]) => {
  const googleCalendarResult = results.find((result) => result.type === "google_calendar");
  if (googleCalendarResult) {
    return googleCalendarResult;
  }

  return (
    results.find((result) => result.type.includes("_video") && result.success) ||
    results.find((result) => result.type.includes("_calendar") && result.success) ||
    results.find((result) => result.success) ||
    results[0]
  );
};
