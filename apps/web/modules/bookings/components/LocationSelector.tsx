import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { shallow } from "zustand/shallow";
import { getEventLocationType, getTranslatedLocation } from "@calcom/app-store/locations";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export const LocationSelector = ({
  locations,
}: {
  locations: { type: string; customLabel?: string; [key: string]: any }[];
}) => {
  const { t } = useLocale();
  const [setSelectedLocation] = useBookerStoreContext((state) => [state.setSelectedLocation], shallow);

  return (
    <div className="flex h-full flex-col px-5 py-3">
      <div className="mb-6 flex items-center">
        <h2 className="text-emphasis text-base font-semibold">
          {t("select_location", { defaultValue: "Select a location" })}
        </h2>
      </div>
      <div className="flex flex-col space-y-3">
        {locations.map((loc, i) => {
          const eventLocationType = getEventLocationType(loc.type);
          if (!eventLocationType) return null;

          const label = loc.customLabel || t(eventLocationType.label) || loc.type;
          const iconSrc = eventLocationType.iconUrl;

          return (
            <button
              key={i}
              onClick={() => setSelectedLocation(loc.type)}
              className="border-subtle hover:bg-muted focus:ring-empashis flex w-full items-center space-x-3 rounded-md border p-4 text-left transition focus:outline-none focus:ring-2"
            >
              {iconSrc && (
                <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-gray-100 dark:bg-gray-800">
                  <img src={iconSrc} alt={label} className="h-4 w-4 dark:invert" />
                </div>
              )}
              <span className="text-default font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
