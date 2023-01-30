import { UseFormReturn, useWatch } from "react-hook-form";

import { EventLocationType, getEventLocationType, locationKeyToString } from "@calcom/app-store/locations";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs } from "@calcom/trpc/react";
import { PhoneInput, AddressInput, Icon, Label } from "@calcom/ui";

import { BookingFormValues } from "./form-config";

type EventLocationsFieldsProps = {
  eventType: NonNullable<RouterOutputs["viewer"]["public"]["event"]>;
  bookingForm: UseFormReturn<BookingFormValues>;
};

const fieldSettings = {
  phone: {
    name: "phone",
    id: "phone",
    labelKey: "phone_number",
    Component: PhoneInput,
  },
  attendeeAddress: {
    name: "attendeeAddress",
    id: "attendeeAddress",
    labelKey: "address",
    Component: AddressInput,
  },
};

export const EventLocationsFields = ({ eventType, bookingForm }: EventLocationsFieldsProps) => {
  const { t } = useLocale();

  const selectedLocationType = useWatch({
    control: bookingForm.control,
    name: "locationType",
    defaultValue: ((): EventLocationType["type"] | undefined => {
      // @TODO: Do we want to be able to supply location via url?
      // if (router.query.location) {
      //   return router.query.location as EventLocationType["type"];
      // }
      if (eventType.locations.length === 1) {
        return eventType.locations[0]?.type;
      }
    })(),
  });

  const selectedLocation = getEventLocationType(selectedLocationType);
  const locationFieldSettings = selectedLocation?.attendeeInputType
    ? fieldSettings[selectedLocation.attendeeInputType] || null
    : null;

  // No fields needed if there's only one location.
  if (eventType.locations.length <= 1) return null;

  return (
    <>
      <div className="mb-4">
        <span className="block text-sm font-medium text-gray-700 dark:text-white">{t("location")}</span>
        {eventType.locations.map((location, i) => {
          const locationString = locationKeyToString(location);
          if (!selectedLocationType) {
            bookingForm.setValue("locationType", eventType.locations[0].type);
          }
          if (typeof locationString !== "string") {
            // It's possible that location app got uninstalled
            return null;
          }
          return (
            <label key={i} className="block">
              {/* @TODO: Create radio group component */}
              <input
                type="radio"
                className="location dark:bg-darkgray-300 dark:border-darkgray-300 h-4 w-4 border-gray-300 text-black focus:ring-black ltr:mr-2 rtl:ml-2"
                {...bookingForm.register("locationType", { required: true })}
                value={location.type}
                defaultChecked={i === 0}
              />
              <span className="text-sm ltr:ml-2 ltr:mr-2 rtl:ml-2 dark:text-white">
                {t(locationKeyToString(location) ?? "")}
              </span>
            </label>
          );
        })}
      </div>
      {locationFieldSettings && (
        <div className="mb-4">
          <Label htmlFor={locationFieldSettings.id}>{t(locationFieldSettings.labelKey)}</Label>
          <div className="mt-1">
            <locationFieldSettings.Component<BookingFormValues>
              control={bookingForm.control}
              bookingForm={bookingForm}
              name={locationFieldSettings.name}
              placeholder={t(selectedLocation?.attendeeInputPlaceholder || "")}
              id={locationFieldSettings.id}
              required
            />
          </div>
          {bookingForm.formState.errors.phone && (
            <div className="mt-2 flex items-center text-sm text-red-700 ">
              <Icon.FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
              <p>{t("invalid_number")}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
};
