/**
 * Helper functions for handling event type locations
 * Provides utilities for converting between API format and UI format
 */

import { getAppIconUrl } from "./getAppIconUrl";
import {
  defaultLocations,
  getDefaultLocationIconUrl,
  DefaultLocationType,
} from "./defaultLocations";
import { formatAppIdToDisplayName } from "./formatters";
import {
  LocationItem,
  ApiLocation,
  ApiLocationInput,
  LocationOption,
  LocationOptionGroup,
} from "../types/locations";

// Re-export formatAppIdToDisplayName for backward compatibility
export { formatAppIdToDisplayName } from "./formatters";

/**
 * Generate a unique ID for a location item
 */
export function generateLocationId(): string {
  return `loc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Map an API location response to a UI LocationItem
 */
export function mapApiLocationToItem(apiLocation: ApiLocation): LocationItem {
  const id = generateLocationId();

  // Handle integration type (conferencing apps)
  if (apiLocation.type === "integration" && apiLocation.integration) {
    const iconUrl = getAppIconUrl("", apiLocation.integration);
    return {
      id,
      type: "integration",
      integration: apiLocation.integration,
      displayName: formatAppIdToDisplayName(apiLocation.integration),
      iconUrl,
      public: apiLocation.public,
    };
  }

  // Handle address type
  if (apiLocation.type === "address") {
    return {
      id,
      type: "address",
      address: apiLocation.address || "",
      displayName: "In Person (Organizer Address)",
      iconUrl: "https://app.cal.com/map-pin-dark.svg",
      public: apiLocation.public,
    };
  }

  // Handle attendeeAddress type
  if (apiLocation.type === "attendeeAddress") {
    return {
      id,
      type: "attendeeAddress",
      displayName: "In Person (Attendee Address)",
      iconUrl: "https://app.cal.com/map-pin-dark.svg",
    };
  }

  // Handle link type
  if (apiLocation.type === "link") {
    return {
      id,
      type: "link",
      link: apiLocation.link || "",
      displayName: "Link Meeting",
      iconUrl: "https://app.cal.com/link.svg",
      public: apiLocation.public,
    };
  }

  // Handle phone type (organizer phone)
  if (apiLocation.type === "phone") {
    return {
      id,
      type: "phone",
      phone: apiLocation.phone || "",
      displayName: "Organizer Phone Number",
      iconUrl: "https://app.cal.com/phone.svg",
      public: apiLocation.public,
    };
  }

  // Handle attendeePhone type
  if (apiLocation.type === "attendeePhone") {
    return {
      id,
      type: "attendeePhone",
      displayName: "Attendee Phone Number",
      iconUrl: "https://app.cal.com/phone.svg",
    };
  }

  // Handle attendeeDefined type
  if (apiLocation.type === "attendeeDefined") {
    return {
      id,
      type: "attendeeDefined",
      displayName: "Custom Attendee Location",
      iconUrl: "https://app.cal.com/message-pin.svg",
    };
  }

  // Fallback for unknown types
  return {
    id,
    type: apiLocation.type as LocationItem["type"],
    displayName: apiLocation.type,
    iconUrl: null,
  };
}

/**
 * Map a UI LocationItem to API location format for saving
 */
export function mapItemToApiLocation(item: LocationItem): ApiLocationInput {
  // Handle integration type
  if (item.type === "integration" && item.integration) {
    return {
      type: "integration",
      integration: item.integration,
    };
  }

  // Handle address type
  if (item.type === "address") {
    return {
      type: "address",
      address: item.address || "",
      public: item.public ?? true,
    };
  }

  // Handle attendeeAddress type
  if (item.type === "attendeeAddress") {
    return {
      type: "attendeeAddress",
    };
  }

  // Handle link type
  if (item.type === "link") {
    return {
      type: "link",
      link: item.link || "",
      public: item.public ?? true,
    };
  }

  // Handle phone type (organizer phone)
  if (item.type === "phone") {
    return {
      type: "phone",
      phone: item.phone || "",
      public: item.public ?? true,
    };
  }

  // Handle attendeePhone type
  if (item.type === "attendeePhone") {
    return {
      type: "attendeePhone",
    };
  }

  // Handle attendeeDefined type
  if (item.type === "attendeeDefined") {
    return {
      type: "attendeeDefined",
    };
  }

  // Fallback
  return {
    type: item.type,
  };
}

/**
 * Get the display name for a location type
 */
export function getLocationDisplayName(locationType: string, integration?: string): string {
  // Handle integration type
  if (locationType === "integration" && integration) {
    return formatAppIdToDisplayName(integration);
  }

  // Check default locations
  const typeToDisplayName: Record<string, string> = {
    address: "In Person (Organizer Address)",
    attendeeAddress: "In Person (Attendee Address)",
    link: "Link Meeting",
    phone: "Organizer Phone Number",
    attendeePhone: "Attendee Phone Number",
    attendeeDefined: "Custom Attendee Location",
  };

  return typeToDisplayName[locationType] || locationType;
}

/**
 * Get the icon URL for a location type
 */
export function getLocationIconUrl(locationType: string, integration?: string): string | null {
  // Handle integration type
  if (locationType === "integration" && integration) {
    return getAppIconUrl("", integration);
  }

  // Check default location icons
  const typeToIcon: Record<string, string> = {
    address: "https://app.cal.com/map-pin-dark.svg",
    attendeeAddress: "https://app.cal.com/map-pin-dark.svg",
    link: "https://app.cal.com/link.svg",
    phone: "https://app.cal.com/phone.svg",
    attendeePhone: "https://app.cal.com/phone.svg",
    attendeeDefined: "https://app.cal.com/message-pin.svg",
  };

  return typeToIcon[locationType] || null;
}

/**
 * Create a new LocationItem from a location option selection
 */
export function createLocationItemFromOption(
  optionValue: string,
  optionLabel: string
): LocationItem {
  const id = generateLocationId();

  // Handle integration options (format: "integrations:app-id")
  if (optionValue.startsWith("integrations:")) {
    const integration = optionValue.replace("integrations:", "");
    return {
      id,
      type: "integration",
      integration,
      displayName: optionLabel,
      iconUrl: getAppIconUrl("", integration),
    };
  }

  // Handle default location types
  const defaultLocation = defaultLocations.find((loc) => loc.type === optionValue);
  if (defaultLocation) {
    const item: LocationItem = {
      id,
      type: mapDefaultLocationTypeToApiType(defaultLocation.type),
      displayName: defaultLocation.label,
      iconUrl: defaultLocation.iconUrl,
    };

    // Add input fields for specific types
    if (defaultLocation.type === DefaultLocationType.InPerson) {
      item.address = "";
      item.public = true;
    } else if (defaultLocation.type === DefaultLocationType.Link) {
      item.link = "";
      item.public = true;
    } else if (defaultLocation.type === DefaultLocationType.UserPhone) {
      item.phone = "";
      item.public = true;
    }

    return item;
  }

  // Fallback
  return {
    id,
    type: optionValue as LocationItem["type"],
    displayName: optionLabel,
    iconUrl: null,
  };
}

/**
 * Map DefaultLocationType to API location type
 */
function mapDefaultLocationTypeToApiType(defaultType: string): LocationItem["type"] {
  const typeMap: Record<string, LocationItem["type"]> = {
    [DefaultLocationType.AttendeeInPerson]: "attendeeAddress",
    [DefaultLocationType.InPerson]: "address",
    [DefaultLocationType.Phone]: "attendeePhone",
    [DefaultLocationType.UserPhone]: "phone",
    [DefaultLocationType.Link]: "link",
    [DefaultLocationType.SomewhereElse]: "attendeeDefined",
  };

  return typeMap[defaultType] || (defaultType as LocationItem["type"]);
}

/**
 * Check if a location type requires additional input
 */
export function locationRequiresInput(locationType: LocationItem["type"]): boolean {
  return ["address", "link", "phone"].includes(locationType);
}

/**
 * Get the input field type for a location
 */
export function getLocationInputType(
  locationType: LocationItem["type"]
): "text" | "phone" | "url" | null {
  switch (locationType) {
    case "address":
      return "text";
    case "link":
      return "url";
    case "phone":
      return "phone";
    default:
      return null;
  }
}

/**
 * Get the input placeholder for a location type
 */
export function getLocationInputPlaceholder(locationType: LocationItem["type"]): string {
  switch (locationType) {
    case "address":
      return "Enter address or place";
    case "link":
      return "https://meet.example.com/join/123456";
    case "phone":
      return "Enter phone number";
    default:
      return "";
  }
}

/**
 * Get the input label for a location type
 */
export function getLocationInputLabel(locationType: LocationItem["type"]): string {
  switch (locationType) {
    case "address":
      return "Address";
    case "link":
      return "Meeting Link";
    case "phone":
      return "Phone Number";
    default:
      return "";
  }
}

/**
 * Validate a location item before saving
 */
export function validateLocationItem(item: LocationItem): { valid: boolean; error?: string } {
  // Integration types don't need additional validation
  if (item.type === "integration") {
    if (!item.integration) {
      return { valid: false, error: "Integration type is required" };
    }
    return { valid: true };
  }

  // Address type requires address field
  if (item.type === "address") {
    if (!item.address || item.address.trim() === "") {
      return { valid: false, error: "Address is required" };
    }
    return { valid: true };
  }

  // Link type requires link field
  if (item.type === "link") {
    if (!item.link || item.link.trim() === "") {
      return { valid: false, error: "Meeting link is required" };
    }
    // URL validation with protocol restriction
    try {
      const url = new URL(item.link);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return { valid: false, error: "Meeting link must use http or https" };
      }
    } catch {
      return { valid: false, error: "Invalid meeting link URL" };
    }
    return { valid: true };
  }

  // Phone type requires phone field
  if (item.type === "phone") {
    if (!item.phone || item.phone.trim() === "") {
      return { valid: false, error: "Phone number is required" };
    }
    return { valid: true };
  }

  // Other types (attendeeAddress, attendeePhone, attendeeDefined) don't need input
  return { valid: true };
}

/**
 * Build location options for dropdown from conferencing options and default locations
 */
export function buildLocationOptions(
  conferencingOptions: Array<{ type: string; appId: string }>
): LocationOptionGroup[] {
  // Cal Video is always available as the default conferencing app
  const calVideoOption: LocationOption = {
    label: "Cal Video",
    iconUrl: getAppIconUrl("daily_video", "cal-video"),
    value: "integrations:cal-video",
    category: "conferencing",
  };

  // Group conferencing apps under "conferencing" category
  const conferencingAppOptions: LocationOption[] = conferencingOptions
    .filter((option) => option.appId !== "cal-video" && option.type !== "daily_video")
    .map((option) => ({
      label: formatAppIdToDisplayName(option.appId),
      iconUrl: getAppIconUrl(option.type, option.appId),
      value: `integrations:${option.appId}`,
      category: "conferencing",
    }));

  // Group default locations by their category
  const grouped: Record<string, LocationOption[]> = {
    conferencing: [calVideoOption, ...conferencingAppOptions],
  };

  // Add default locations by category
  defaultLocations.forEach((location) => {
    const option: LocationOption = {
      label: location.label,
      iconUrl: location.iconUrl,
      value: location.type,
      category: location.category,
    };

    if (!grouped[location.category]) {
      grouped[location.category] = [];
    }
    grouped[location.category].push(option);
  });

  // Convert to array of groups with proper ordering
  const categoryOrder = ["conferencing", "in person", "phone", "other"];
  const categoryLabels: Record<string, string> = {
    conferencing: "Conferencing",
    "in person": "In Person",
    phone: "Phone",
    other: "Other",
  };

  return categoryOrder
    .filter((category) => grouped[category] && grouped[category].length > 0)
    .map((category) => ({
      category: categoryLabels[category] || category,
      options: grouped[category],
    }));
}

/**
 * Convert a display name back to a location value for API
 * Used when selecting a location from a dropdown
 *
 * @param displayName - The display name shown in UI (e.g., "Google Meet", "In Person (Organizer Address)")
 * @param defaultLocationsList - List of default locations to check against
 * @returns Location value object for API, or null if not found
 */
export const displayNameToLocationValue = (
  displayName: string,
  defaultLocationsList: Array<{ label: string; type: string }>
): {
  type: string;
  integration?: string;
  address?: string;
  link?: string;
  phone?: string;
  public?: boolean;
} | null => {
  // First check if it's a default location
  const defaultLocation = defaultLocationsList.find((loc) => loc.label === displayName);
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
