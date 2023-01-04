import { getEventLocationType, locationKeyToString } from "@calcom/app-store/locations";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon, Tooltip } from "@calcom/ui";

import { Props } from "./pages/AvailabilityPage";

export function AvailableEventLocations({ locations }: { locations: Props["eventType"]["locations"] }) {
  const { t } = useLocale();

  return locations.length ? (
    <div className="dark:text-darkgray-600 mr-6 flex w-full flex-col space-y-2 break-words text-sm text-gray-600">
      {locations.map((location) => {
        const eventLocationType = getEventLocationType(location.type);
        if (!eventLocationType) {
          // It's possible that the location app got uninstalled
          return null;
        }
        return (
          <div key={location.type} className="flex flex-row items-center text-sm font-medium">
            {eventLocationType.iconUrl === "/link.svg" ? (
              <Icon.FiLink className="dark:text-darkgray-600 ml-[2px] h-4 w-4 opacity-70 ltr:mr-[10px] rtl:ml-[10px] dark:opacity-100 " />
            ) : (
              <img
                src={eventLocationType.iconUrl}
                className={classNames(
                  "ml-[2px] h-4 w-4 opacity-70 ltr:mr-[10px] rtl:ml-[10px] dark:opacity-100 ",
                  !eventLocationType.iconUrl?.includes("api") ? "dark:invert" : ""
                )}
                alt={`${eventLocationType.label} icon`}
              />
            )}
            <Tooltip content={t(locationKeyToString(location) ?? "")}>
              <p className="truncate">{t(locationKeyToString(location) ?? "")}</p>
            </Tooltip>
          </div>
        );
      })}
    </div>
  ) : (
    <></>
  );
}
