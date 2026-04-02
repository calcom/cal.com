import { getEventLocationType, getTranslatedLocation } from "@calcom/app-store/locations";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { EventMetaBlock } from "./Details";

export const EventLocations = ({ event }: { event: BookerEvent }) => {
  const { t } = useLocale();
  const locations = event.locations;

  if (!locations?.length) return null;

  const getLocationToDisplay = (location: BookerEvent["locations"][number]) => {
    const eventLocationType = getEventLocationType(location.type);
    const translatedLocation = getTranslatedLocation(location, eventLocationType, t);

    return translatedLocation;
  };
  const eventLocationType = getEventLocationType(locations[0].type);
  const iconUrl = locations.length > 1 || !eventLocationType?.iconUrl ? undefined : eventLocationType.iconUrl;
  const icon = locations.length > 1 || !eventLocationType?.iconUrl ? "map-pin" : undefined;

  return (
    <EventMetaBlock iconUrl={iconUrl} icon={icon} isDark={eventLocationType?.iconUrl?.includes("-dark")}>
      {locations.length === 1 && (
        <Tooltip content={getLocationToDisplay(locations[0])}>
          <div className="" key={locations[0].type}>
            {getLocationToDisplay(locations[0])}
          </div>
        </Tooltip>
      )}
      {locations.length > 1 && (
        <div
          key={locations[0].type}
          className="before:bg-subtle relative before:pointer-events-none before:absolute before:inset-0 before:bottom-[-5px] before:left-[-30px] before:top-[-5px] before:w-[calc(100%+35px)] before:rounded-md before:py-3 before:opacity-0 before:transition-opacity hover:before:opacity-100">
          <Tooltip
            content={
              <>
                <p className="mb-2">{t("select_on_next_step")}</p>
                <ul className="pl-1">
                  {locations.map((location, index) => (
                    <li key={`${location.type}-${index}`} className="mt-1">
                      <div className="flex flex-row items-center">
                        <img
                          src={getEventLocationType(location.type)?.iconUrl}
                          className={classNames(
                            "h-3 w-3 opacity-70 ltr:mr-[10px] rtl:ml-[10px] dark:opacity-100 ",
                            !getEventLocationType(location.type)?.iconUrl?.startsWith("/app-store")
                              ? "dark:invert-[.65]"
                              : ""
                          )}
                          alt={`${getEventLocationType(location.type)?.label} icon`}
                        />
                        <span>{getLocationToDisplay(location)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            }>
            <span className="relative z-2 py-2">{t("num_locations", { num: locations.length })}</span>
          </Tooltip>
        </div>
      )}
    </EventMetaBlock>
  );
};
