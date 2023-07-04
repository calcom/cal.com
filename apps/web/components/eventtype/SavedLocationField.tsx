import type { EventTypeSetupProps } from "pages/event-types/[type]";
import type { useForm } from "react-hook-form";

import type { EventLocationType } from "@calcom/app-store/locations";
import cx from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Edit2, X } from "@calcom/ui/components/icon";

type Props = {
  location: EventLocationType["type"];
  index: number;
  eventLocationType: EventLocationType;
  eventLabel: string;
  locationFormMethods: ReturnType<typeof useForm>;
  removeLocation: (selectedLocation: EventTypeSetupProps["eventType"]["locations"][number]) => void;
  setEditingLocationType: (value: string) => void;
  openLocationModal: (value: EventLocationType["type"]) => void;
};

export const SavedLocationField = (props: Props) => {
  const {
    location,
    index,
    eventLocationType,
    eventLabel,
    locationFormMethods,
    openLocationModal,
    setEditingLocationType,
    removeLocation,
  } = props;
  const { t } = useLocale();

  return (
    <li
      key={`${location.type}${index}`}
      className="border-default text-default mb-2 h-9 rounded-md border px-2 py-1.5 hover:cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <img
            src={eventLocationType.iconUrl}
            className={cx(
              "h-4 w-4",
              // invert all the icons except app icons
              eventLocationType.iconUrl &&
                !eventLocationType.iconUrl.startsWith("/app-store") &&
                "dark:invert"
            )}
            alt={`${eventLocationType.label} logo`}
          />
          <span className="ms-1 line-clamp-1 text-sm">{eventLabel}</span>
        </div>
        <div className="flex">
          <button
            type="button"
            onClick={() => {
              // locationFormMethods.setValue("locationType", location.type);
              locationFormMethods.unregister("locationLink");
              locationFormMethods.unregister("locationAddress");
              locationFormMethods.unregister("locationPhoneNumber");
              setEditingLocationType(location.type);
              openLocationModal(location.type);
            }}
            aria-label={t("edit")}
            className="hover:text-emphasis text-subtle mr-1 p-1">
            <Edit2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => removeLocation(location)} aria-label={t("remove")}>
            <X className="border-l-1 hover:text-emphasis text-subtle h-6 w-6 pl-1 " />
          </button>
        </div>
      </div>
    </li>
  );
};
