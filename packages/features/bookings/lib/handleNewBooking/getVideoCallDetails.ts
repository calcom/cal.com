import type { AdditionalInformation } from "@calcom/types/Calendar";
import type { EventResult } from "@calcom/types/EventManager";

type ExtraAdditionalInfo = AdditionalInformation & {
  url?: string | undefined;
  iCalUID?: string | undefined;
};

type VideoResult = EventResult<ExtraAdditionalInfo>;

function extractUpdatedVideoEvent(result: VideoResult | undefined): ExtraAdditionalInfo | undefined {
  if (!result || !result.success) return undefined;
  return Array.isArray(result.updatedEvent) ? result.updatedEvent[0] : result.updatedEvent;
}

function extractMetadata(event: ExtraAdditionalInfo): AdditionalInformation {
  return {
    hangoutLink: event.hangoutLink,
    conferenceData: event.conferenceData,
    entryPoints: event.entryPoints,
  };
}

export function getVideoCallDetails({ results }: { results: VideoResult[] }) {
  const firstVideoResult = results.find((result) => result.type.includes("_video"));
  const updatedVideoEvent = extractUpdatedVideoEvent(firstVideoResult);
  const metadata = updatedVideoEvent ? extractMetadata(updatedVideoEvent) : {};

  const videoCallUrl = metadata.hangoutLink || updatedVideoEvent?.url;

  return { videoCallUrl, metadata, updatedVideoEvent };
}
