export function getIntegrationName(name: String) {
    switch(name) {
        case "google_calendar":
            return "Google Calendar";
        default:
            return "Unknown";
    }
}

export function getIntegrationType(name: String) {
    switch(name) {
        case "google_calendar":
            return "Calendar";
        default:
            return "Unknown";
    }
}