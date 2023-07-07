import type { DefaultEventLocationType, EventLocationTypeFromApp } from "@calcom/app-store/locations";
import { getEventLocationType, getTranslatedLocation } from "@calcom/app-store/locations";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Tooltip } from "@calcom/ui";
import { Link } from "@calcom/ui/components/icon";

import type { Props } from "./pages/AvailabilityPage";

const excludeNullValues = (value: unknown) => !!value;

export function AvailableEventLocations({ locations }: { locations: Props["eventType"]["locations"] }) {
  const { t } = useLocale();

  const renderIcon = (
    eventLocationType: DefaultEventLocationType | EventLocationTypeFromApp,
    isTooltip: boolean
  ) => {
    return (
      <img
        src={eventLocationType.iconUrl}
        className={classNames(
          "me-[10px] ml-[2px] h-4 w-4 opacity-70 dark:opacity-100",
          !eventLocationType.iconUrl?.startsWith("/app-store") ? "dark:invert-[.65]" : "",
          !eventLocationType.iconUrl?.startsWith("/app-store") && isTooltip && "invert"
        )}
        alt={`${eventLocationType.label} icon`}
      />
    );
  };

  const renderLocations = locations.map((location, index) => {
    const eventLocationType = getEventLocationType(location.type);
    if (!eventLocationType) {
      // It's possible that the location app got uninstalled
      return null;
    }
    if (eventLocationType.variable === "hostDefault") {
      return null;
    }

    const translatedLocation = getTranslatedLocation(location, eventLocationType, t);

    return (
      <div key={`${location.type}-${index}`} className="flex flex-row items-center text-sm font-medium">
        {eventLocationType.iconUrl === "/link.svg" ? (
          <Link className="text-default ml-[2px] h-4 w-4  ltr:mr-[10px] rtl:ml-[10px] " />
        ) : (
          renderIcon(eventLocationType, false)
        )}
        <Tooltip content={translatedLocation}>
          <p className="line-clamp-1">{translatedLocation}</p>
        </Tooltip>
      </div>
    );
  });

  const filteredLocations = renderLocations.filter(excludeNullValues) as JSX.Element[];

  const renderLocationTooltip = () => {
    return (
      <div className="my-2 me-2 flex w-full flex-col space-y-4 break-words text-sm">
        {locations.map((location, index) => {
          const eventLocationType = getEventLocationType(location.type);
          if (!eventLocationType) {
            return null;
          }
          const translatedLocation = getTranslatedLocation(location, eventLocationType, t);
          return (
            <div key={`${location.type}-${index}`} className="flex flex-row items-center text-sm font-medium">
              {renderIcon(eventLocationType, true)}
              <p className="line-clamp-1">{translatedLocation}</p>
            </div>
          );
        })}
      </div>
    );
  };

  return filteredLocations.length > 1 ? (
    <div className="flex flex-row items-center text-sm font-medium">
      <img
        src="/map-pin.svg"
        className={classNames("me-[10px] ml-[2px] h-4 w-4 opacity-70 dark:invert")}
        alt="map-pin"
      />
      <Tooltip content={renderLocationTooltip()}>
        <p className="line-clamp-1">
          {t("location_options", {
            locationCount: filteredLocations.length,
          })}
        </p>
      </Tooltip>
    </div>
  ) : filteredLocations.length === 1 ? (
    <div className="text-default mr-6 flex w-full flex-col space-y-4 break-words text-sm">
      {filteredLocations}
    </div>
  ) : null;
}
