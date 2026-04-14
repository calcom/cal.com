import { getLocation } from "@calcom/lib/CalEventParser";

type CrmEventLocationInfo = {
  resolvedLocation: string | null;
  isProperUrl: boolean;
  rawLocation: string | null;
  isVideoIntegrationLocation: boolean;
  hasVideoCallData: boolean;
  videoCallDataType: string | null;
  videoCallDataUrl: string | null;
  hangoutLink: string | null;
};

type CalendarEventForLocation = {
  videoCallData?: { type?: string; url?: string };
  additionalInformation?: { hangoutLink?: string };
  location?: string | null;
  uid?: string | null;
};

/**
 * Returns true when the raw location value points to a dynamic video
 * integration (e.g. "integrations:google:meet", "integrations:zoom").
 * These locations are expected to resolve to a proper video URL at
 * runtime via booking references or hangoutLink.
 */
function isVideoIntegrationLocation(location: string | null | undefined): boolean {
  return !!location?.startsWith("integrations:");
}

/**
 * Computes diagnostic info about the location that will be sent to a CRM.
 * Used to detect when the resolved location is not a proper video URL,
 * which can happen when booking references aren't yet available due to a
 * race condition and getLocation falls back to a provider name (e.g. "Google").
 */
function getCrmEventLocationInfoForLogging(calendarEvent: CalendarEventForLocation): CrmEventLocationInfo {
  const resolvedLocation = getLocation(calendarEvent);
  const isProperUrl = /^https?:\/\//.test(resolvedLocation);

  return {
    resolvedLocation: resolvedLocation || null,
    isProperUrl,
    rawLocation: calendarEvent.location ?? null,
    isVideoIntegrationLocation: isVideoIntegrationLocation(calendarEvent.location),
    hasVideoCallData: !!calendarEvent.videoCallData,
    videoCallDataType: calendarEvent.videoCallData?.type ?? null,
    videoCallDataUrl: calendarEvent.videoCallData?.url ?? null,
    hangoutLink: calendarEvent.additionalInformation?.hangoutLink ?? null,
  };
}

export { getCrmEventLocationInfoForLogging, isVideoIntegrationLocation };
export type { CrmEventLocationInfo };
