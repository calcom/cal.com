import type { EventResult } from "@calcom/types/EventManager";
import type { AdditionalInformation } from "@calcom/types/Calendar";

export function getVideoCallDetails({
  results,
}: {
  results: EventResult<AdditionalInformation & { url?: string | undefined; iCalUID?: string | undefined }>[];
}) {
  const firstVideoResult = results.find((result) => result.type.includes("_video"));
  const metadata: AdditionalInformation = {};
  let updatedVideoEvent: AdditionalInformation & { url?: string | undefined; iCalUID?: string | undefined } | null = null;

  if (firstVideoResult && firstVideoResult.success) {
    const tempUpdatedVideoEvent = Array.isArray(firstVideoResult.updatedEvent)
      ? firstVideoResult.updatedEvent[0]
      : firstVideoResult.updatedEvent;

    updatedVideoEvent = tempUpdatedVideoEvent !== undefined ? tempUpdatedVideoEvent : null;

    if (updatedVideoEvent !== null) {
      metadata.hangoutLink = updatedVideoEvent.hangoutLink;
      metadata.conferenceData = updatedVideoEvent.conferenceData;
      metadata.entryPoints = updatedVideoEvent.entryPoints;
    }
  }

  const videoCallUrl = metadata.hangoutLink || (updatedVideoEvent && updatedVideoEvent.url);

  return { videoCallUrl, metadata, updatedVideoEvent };
}
