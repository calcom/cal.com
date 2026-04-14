import type { LocationObject } from "@calcom/app-store/locations";
import { DefaultEventLocationTypeEnum, locationKeyToString } from "@calcom/app-store/locations";
import { getEventLocationType } from "@calcom/app-store/locations";
import { getTranslatedLocation } from "@calcom/app-store/locations";
import type { useLocale } from "@calcom/i18n/useLocale";
import notEmpty from "@calcom/lib/notEmpty";

export default function getLocationsOptionsForSelect(
  locations: LocationObject[],
  t: ReturnType<typeof useLocale>["t"]
) {
  return locations
    .map((location) => {
      const eventLocation = getEventLocationType(location.type);
      const locationString = locationKeyToString(location);

      if (typeof locationString !== "string" || !eventLocation) {
        // It's possible that location app got uninstalled
        return null;
      }
      const type = eventLocation.type;
      let defaultSomewhereElseLabel: string | undefined;
      if (type === DefaultEventLocationTypeEnum.SomewhereElse) {
        defaultSomewhereElseLabel = t("somewhere_else");
      }
      const translatedLocation =
        location.customLabel ||
        defaultSomewhereElseLabel ||
        getTranslatedLocation(location, eventLocation, t);

      return {
        // XYZ: is considered a namespace in i18next https://www.i18next.com/principles/namespaces and thus it gets cleaned up.
        label: translatedLocation || locationString,
        value: type,
        inputPlaceholder: t(eventLocation?.attendeeInputPlaceholder || ""),
      };
    })
    .filter(notEmpty);
}
