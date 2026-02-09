import { getAppIconUrl } from "./getAppIconUrl";

// Helper to extract clean meeting URL from potentially wrapped URLs
function extractMeetingUrl(location: string): string {
  // Check if it's a goo.gl redirect URL with embedded meet.google.com link
  if (location.includes("goo.gl") && location.includes("meet.google.com")) {
    // Extract the actual meet.google.com URL from the redirect
    const meetMatch = location.match(/meet\.google\.com\/[a-z]+-[a-z]+-[a-z]+/i);
    if (meetMatch) {
      return `https://${meetMatch[0]}`;
    }
  }
  return location;
}

// Helper to detect meeting type from location URL and get icon/label
export const getMeetingInfo = (
  location?: string
): { appId: string; label: string; iconUrl: string | null; cleanUrl: string } | null => {
  if (!location) return null;

  // Check if it's a URL
  if (!location.match(/^https?:\/\//)) return null;

  const lowerLocation = location.toLowerCase();
  const cleanUrl = extractMeetingUrl(location);

  // Cal Video
  if (lowerLocation.includes("cal.com/video") || lowerLocation.includes("cal.video")) {
    return {
      appId: "cal-video",
      label: "Join Cal Video",
      iconUrl: getAppIconUrl("daily_video", "cal-video"),
      cleanUrl,
    };
  }

  // Google Meet (including goo.gl redirect URLs)
  if (
    lowerLocation.includes("meet.google.com") ||
    (lowerLocation.includes("goo.gl") && lowerLocation.includes("meet"))
  ) {
    return {
      appId: "google-meet",
      label: "Join Google Meet",
      iconUrl: getAppIconUrl("google_video", "google-meet"),
      cleanUrl,
    };
  }

  // Zoom
  if (lowerLocation.includes("zoom.us") || lowerLocation.includes("zoom.com")) {
    return {
      appId: "zoom",
      label: "Join Zoom",
      iconUrl: getAppIconUrl("zoom_video", "zoom"),
      cleanUrl,
    };
  }

  // Microsoft Teams
  if (lowerLocation.includes("teams.microsoft.com") || lowerLocation.includes("teams.live.com")) {
    return {
      appId: "msteams",
      label: "Join Microsoft Teams",
      iconUrl: getAppIconUrl("office365_video", "msteams"),
      cleanUrl,
    };
  }

  // Webex
  if (lowerLocation.includes("webex.com")) {
    return {
      appId: "webex",
      label: "Join Webex",
      iconUrl: getAppIconUrl("webex_video", "webex"),
      cleanUrl,
    };
  }

  // Jitsi
  if (lowerLocation.includes("meet.jit.si") || lowerLocation.includes("jitsi")) {
    return {
      appId: "jitsi",
      label: "Join Jitsi",
      iconUrl: getAppIconUrl("jitsi_video", "jitsi"),
      cleanUrl,
    };
  }

  // Not a recognized conferencing app
  return null;
};
