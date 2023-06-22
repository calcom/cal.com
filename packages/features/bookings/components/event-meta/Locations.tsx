import { getEventLocationType } from "@calcom/app-store/locations";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Tooltip } from "@calcom/ui";
import { MapPin } from "@calcom/ui/components/icon";

import type { PublicEvent } from "../../types";
import { EventMetaBlock } from "./Details";

export const EventLocations = ({ event }: { event: PublicEvent }) => {
  const { t } = useLocale();
  const locations = event.locations;
  console.log("location", locations);
  if (!locations?.length) return null;

  const getLocationToDisplay = (location: PublicEvent["locations"][number]) => {
    const locationType = getEventLocationType(location.type);
    const defaultLocationLabel = t(locationType?.label ?? "");

    switch (locationType?.label) {
      case "in_person":
        return location?.address ?? defaultLocationLabel;

      case "organizer_phone_number":
        return location?.hostPhoneNumber ?? defaultLocationLabel;

      case "link_meeting":
        return location?.link ?? defaultLocationLabel;

      default:
        return defaultLocationLabel;
    }
  };

  return (
    <EventMetaBlock icon={MapPin}>
      {locations.length === 1 && <div key={locations[0].type}>{t(getLocationToDisplay(locations[0]))}</div>}
      {locations.length > 1 && (
        <div
          key={locations[0].type}
          className="before:bg-subtle relative before:pointer-events-none before:absolute before:inset-0 before:left-[-30px] before:top-[-5px] before:bottom-[-5px] before:w-[calc(100%_+_35px)] before:rounded-md before:py-3 before:opacity-0 before:transition-opacity hover:before:opacity-100">
          <Tooltip
            content={
              <>
                <p className="mb-2">{t("select_on_next_step")}</p>
                <ul className="list-disc pl-3">
                  {locations.map((location) => (
                    <li key={location.type}>
                      <span>{t(getLocationToDisplay(location))}</span>
                    </li>
                  ))}
                </ul>
              </>
            }>
            <span className="relative z-[2] py-2">{t("num_locations", { num: locations.length })}</span>
          </Tooltip>
        </div>
      )}
    </EventMetaBlock>
  );
};
