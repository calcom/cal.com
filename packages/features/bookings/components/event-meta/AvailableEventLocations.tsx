import type {
  DefaultEventLocationType,
  EventLocationTypeFromApp,
  LocationObject,
} from "@calcom/app-store/locations";
import { getEventLocationType, getTranslatedLocation } from "@calcom/app-store/locations";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import invertLogoOnDark from "@calcom/lib/invertLogoOnDark";
import { Tooltip } from "@calcom/ui";
import { Link } from "@calcom/ui/components/icon";

const excludeNullValues = (value: unknown) => !!value;

function RenderIcon({
  eventLocationType,
  isTooltip,
}: {
  eventLocationType: DefaultEventLocationType | EventLocationTypeFromApp;
  isTooltip: boolean;
}) {
  return (
    <img
      src={eventLocationType.iconUrl}
      className={classNames(invertLogoOnDark(eventLocationType?.iconUrl, true), "me-[10px] h-4 w-4")}
      alt={`${eventLocationType.label} icon`}
    />
  );
}

function RenderLocationTooltip({ locations }: { locations: LocationObject[] }) {
  const { t } = useLocale();

  return (
    <div className="my-2 me-2 flex w-full flex-col space-y-3 break-words">
      <p>{t("select_on_next_step")}</p>
      {locations.map(
        (
          location: Pick<Partial<LocationObject>, "link" | "address"> &
            Omit<LocationObject, "link" | "address">,
          index: number
        ) => {
          const eventLocationType = getEventLocationType(location.type);
          if (!eventLocationType) {
            return null;
          }
          const translatedLocation = getTranslatedLocation(location, eventLocationType, t);
          return (
            <div key={`${location.type}-${index}`} className="font-sm flex flex-row items-center">
              <RenderIcon eventLocationType={eventLocationType} isTooltip />
              <p className="line-clamp-1">{translatedLocation}</p>
            </div>
          );
        }
      )}
    </div>
  );
}

export function AvailableEventLocations({ locations }: { locations: LocationObject[] }) {
  const { t } = useLocale();

  const renderLocations = locations.map(
    (
      location: Pick<Partial<LocationObject>, "link" | "address"> & Omit<LocationObject, "link" | "address">,
      index: number
    ) => {
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
            <Link className="text-default h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
          ) : (
            <RenderIcon eventLocationType={eventLocationType} isTooltip={false} />
          )}
          <Tooltip content={translatedLocation}>
            <p className="line-clamp-1">{translatedLocation}</p>
          </Tooltip>
        </div>
      );
    }
  );

  const filteredLocations = renderLocations.filter(excludeNullValues) as JSX.Element[];

  return filteredLocations.length > 1 ? (
    <div className="flex flex-row items-center text-sm font-medium">
      <img
        src="/map-pin-dark.svg"
        className={classNames("me-[10px] h-4 w-4 opacity-70 dark:invert")}
        alt="map-pin"
      />
      <Tooltip content={<RenderLocationTooltip locations={locations} />}>
        <p className="line-clamp-1">
          {t("location_options", {
            locationCount: filteredLocations.length,
          })}
        </p>
      </Tooltip>
    </div>
  ) : filteredLocations.length === 1 ? (
    <div className="text-default mr-6 flex w-full flex-col space-y-4 break-words text-sm rtl:mr-2">
      {filteredLocations}
    </div>
  ) : null;
}
