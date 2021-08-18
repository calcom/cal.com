export function getIntegrationName(name: String) {
    switch(name) {
        case "google_calendar":
            return "Google Calendar";
        case "office365_calendar":
            return "Office 365 Calendar";
        case "zoom_video":
            return "Zoom";
        case "caldav_calendar":
            return "CalDav Server";
        default:
            return "Unknown";
    }
}

export function getIntegrationType(name: String) {
    if (name.endsWith('_calendar')) {
        return 'Calendar';
    }
    return "Unknown";
}
