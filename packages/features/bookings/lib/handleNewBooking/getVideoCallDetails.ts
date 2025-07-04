import type { AdditionalInformation } from "@calcom/types/Calendar";
import type { EventResult } from "@calcom/types/EventManager";

type ExtraAdditionalInfo = AdditionalInformation & {
  url?: string | undefined;
  iCalUID?: string | undefined;
};

type VideoResult = EventResult<ExtraAdditionalInfo>;

function extractUpdatedVideoEvent(result: VideoResult | undefined): ExtraAdditionalInfo | undefined {
  if (!result || !result.success) return undefined;
  const videoEvent = result.updatedEvent || result.createdEvent;
  return Array.isArray(videoEvent) ? videoEvent[0] : videoEvent;
}

function extractMetadata(event: ExtraAdditionalInfo): AdditionalInformation {
  return {
    hangoutLink: event.hangoutLink,
    conferenceData: event.conferenceData,
    entryPoints: event.entryPoints,
  };
}

export function getVideoCallDetails({
  results,
  bookingUid,
}: {
  results: VideoResult[];
  bookingUid?: string;
}) {
  const firstVideoResult = results.find((result) => result.type.includes("_video"));
  const updatedVideoEvent = extractUpdatedVideoEvent(firstVideoResult);
  const metadata = updatedVideoEvent ? extractMetadata(updatedVideoEvent) : {};

  let videoCallUrl = updatedVideoEvent?.hangoutLink || updatedVideoEvent?.url;

  if (firstVideoResult?.type === "daily_video" && bookingUid) {
    videoCallUrl = `http://app.cal.local:3000/video/${bookingUid}`;
  }

  return {
    videoCallUrl,
    metadata,
    updatedVideoEvent,
  };
}
