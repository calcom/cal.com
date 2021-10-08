export function getIntegrationName(name: string) {
  switch (name) {
    case "google_calendar":
      return "Google Calendar";
    case "office365_calendar":
      return "Office 365 Calendar";
    case "zoom_video":
      return "Zoom";
    case "caldav_calendar":
      return "CalDav Server";
    case "stripe_payment":
      return "Stripe";
    case "apple_calendar":
      return "Apple Calendar";
    case "daily_video":
      return "Daily";
  }
}

export function getIntegrationType(name: string): string {
  if (name.endsWith("_calendar")) {
    return "Calendar";
  }
  if (name.endsWith("_payment")) {
    return "Payment";
  }
  return "Unknown";
}
