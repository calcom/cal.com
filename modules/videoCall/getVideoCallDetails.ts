import type { EventResult } from "@calcom/types/EventManager";
import type { AdditionalInformation } from "@calcom/types/Calendar";

export function getVideoCallDetails({
    results,
  }: {
    results: EventResult<AdditionalInformation & { url?: string | undefined; iCalUID?: string | undefined }>[];
  }) {
    const firstVideoResult = results.find((result) => result.type.includes("_video"));
    const metadata: AdditionalInformation = {};
    let updatedVideoEvent = null;
  
    if (firstVideoResult && firstVideoResult.success) {
      updatedVideoEvent = Array.isArray(firstVideoResult.updatedEvent)
        ? firstVideoResult.updatedEvent[0]
        : firstVideoResult.updatedEvent;
  
      if (updatedVideoEvent) {
        metadata.hangoutLink = updatedVideoEvent.hangoutLink;
        metadata.conferenceData = updatedVideoEvent.conferenceData;
        metadata.entryPoints = updatedVideoEvent.entryPoints;
      }
    }
    const videoCallUrl = metadata.hangoutLink || updatedVideoEvent?.url;
  
    return { videoCallUrl, metadata, updatedVideoEvent };
  }