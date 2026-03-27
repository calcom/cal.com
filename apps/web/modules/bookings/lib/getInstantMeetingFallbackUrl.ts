const INSTANT_MEETING_PARAMS = ["isInstantMeeting"];

// The booker store injects these params into the URL during the instant meeting flow
// (slot selection, date/month navigation, booking response). We strip them on fallback
// so the original URL params passed by the embedder (e.g. routed team member IDs) are
// preserved cleanly when the user falls back to normal scheduling.
const STORE_INJECTED_PARAMS = ["bookingId", "bookingUid", "slot", "date", "month"];

export function getInstantMeetingFallbackUrl(pathname: string, search: string): string {
  const params = new URLSearchParams(search);

  for (const param of [...INSTANT_MEETING_PARAMS, ...STORE_INJECTED_PARAMS]) {
    params.delete(param);
  }

  const remaining = params.toString();
  return remaining ? `${pathname}?${remaining}` : pathname;
}

export function getInstantMeetingConnectUrl(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.set("isInstantMeeting", "true");
  return `${pathname}?${params.toString()}`;
}
