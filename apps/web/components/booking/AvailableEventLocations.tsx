import { getEventLocationType, locationKeyToString } from "@calcom/app-store/locations";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Props } from "./pages/AvailabilityPage";

export function AvailableEventLocations({ locations }: { locations: Props["eventType"]["locations"] }) {
  return (
    <div>
      <div className="flex-warp mr-6 flex break-words text-sm text-gray-600 dark:text-white">
        <p className="w-full">
          {locations.map((location) => {
            const eventLocationType = getEventLocationType(location.type);
            if (!eventLocationType) {
              // It's possible that the location app got uninstalled
              return null;
            }
            return (
              <span key={location.type} className="flex flex-row items-center pt-1">
                <img
                  src={eventLocationType.iconUrl}
                  className="mr-[10px] ml-[2px] h-4 w-4"
                  alt={`${eventLocationType.label} icon`}
                />
                <span key={location.type}>{locationKeyToString(location)} </span>
              </span>
            );
          })}
        </p>
      </div>
    </div>
  );
}
