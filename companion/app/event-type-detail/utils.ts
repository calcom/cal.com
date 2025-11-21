// Utility functions for Event Type Detail

export const formatDuration = (minutes: string) => {
  const mins = parseInt(minutes) || 0;
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
};

export const truncateTitle = (text: string, maxLength: number = 20) => {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export const formatAppIdToDisplayName = (appId: string): string => {
  // Convert appId like "google-meet" to "Google Meet"
  return appId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const displayNameToLocationValue = (
  displayName: string,
  defaultLocations: Array<{ label: string; type: string }>
): {
  type: string;
  integration?: string;
  address?: string;
  link?: string;
  phone?: string;
  public?: boolean;
} | null => {
  // First check if it's a default location
  const defaultLocation = defaultLocations.find((loc) => loc.label === displayName);
  if (defaultLocation) {
    // Map internal location types to API location types
    switch (defaultLocation.type) {
      case "attendeeInPerson":
        return { type: "attendeeAddress" };
      case "inPerson":
        return { type: "address", address: "", public: true };
      case "link":
        return { type: "link", link: "", public: true };
      case "phone":
        return { type: "attendeePhone" };
      case "userPhone":
        return { type: "phone", phone: "", public: true };
      default:
        return null;
    }
  }

  // Check if it's a conferencing app (formatted display name)
  // e.g., "Google Meet", "Zoom", etc.
  const appId = displayName.toLowerCase().replace(/\s+/g, "-");
  return { type: "integration", integration: appId };
};

export default {
  formatDuration,
  truncateTitle,
  formatAppIdToDisplayName,
  displayNameToLocationValue,
};
