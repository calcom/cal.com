import type { LocationObject } from "@calcom/app-store/locations";
import { locationKeyToString } from "@calcom/app-store/locations";
import { getEventLocationType } from "@calcom/app-store/locations";
import type { useLocale } from "@calcom/lib/hooks/useLocale";
import notEmpty from "@calcom/lib/notEmpty";

const bufferHostnames = ["meetings.bufferinsurance.com", "buffer-cal-us-east-1-staging.dcsdevelopment.me"];

const getLocationTranslation = (projectName: string) => {
  if (process.env.NEXT_PUBLIC_PROJECT_VAR_TRANSLATIONS) {
    return JSON.parse(process.env.NEXT_PUBLIC_PROJECT_VAR_TRANSLATIONS)[projectName];
  }
  return null;
};

export default function getLocationsOptionsForSelect(
  locations: LocationObject[],
  t: ReturnType<typeof useLocale>["t"]
) {
  return locations
    .map((location) => {
      const eventLocation = getEventLocationType(location.type);
      const locationString = locationKeyToString(location);
      const projectName = typeof window !== "undefined" ? window.location.hostname : "";

      const replaceLocationString = (locationString: string) => {
        if (bufferHostnames.includes(projectName)) {
          const replacementFields = getLocationTranslation("buffer");
          if (replacementFields && replacementFields[locationString]) {
            return replacementFields[locationString];
          }
        }
        return t(locationString);
      };

      if (typeof locationString !== "string" || !eventLocation) {
        // It's possible that location app got uninstalled
        return null;
      }
      const type = eventLocation.type;

      return {
        // XYZ: is considered a namespace in i18next https://www.i18next.com/principles/namespaces and thus it get's cleaned up.
        // Beacause there can be a URL in here, simply don't translate it if it starts with http: or https:. This would allow us to keep supporting namespaces if we plan to use them
        label:
          locationString.search(/^https?:/) !== -1 ? locationString : replaceLocationString(locationString),
        value: type,
        inputPlaceholder: t(eventLocation?.attendeeInputPlaceholder || ""),
      };
    })
    .filter(notEmpty);
}
