import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ErrorMessage } from "@hookform/error-message";
import { Trans } from "next-i18next";
import Link from "next/link";
import type { EventTypeSetupProps } from "pages/event-types/[type]";
import { useEffect, useState } from "react";
import { Controller, useFieldArray } from "react-hook-form";
import type { UseFormGetValues, UseFormSetValue, Control, FormState } from "react-hook-form";

import type { EventLocationType } from "@calcom/app-store/locations";
import { getEventLocationType, MeetLocationType } from "@calcom/app-store/locations";
import type { LocationFormValues } from "@calcom/features/eventtypes/lib/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon, Input, PhoneInput, Button, showToast } from "@calcom/ui";

import CheckboxField from "@components/ui/form/CheckboxField";
import type { SingleValueLocationOption } from "@components/ui/form/LocationSelect";
import LocationSelect from "@components/ui/form/LocationSelect";

export type TEventTypeLocation = Pick<EventTypeSetupProps["eventType"], "locations">;
export type TLocationOptions = Pick<EventTypeSetupProps, "locationOptions">["locationOptions"];
export type TDestinationCalendar = { integration: string } | null;
export type TPrefillLocation = { credentialId?: number; type: string };

type LocationsProps = {
  team: { id: number } | null;
  destinationCalendar: TDestinationCalendar;
  showAppStoreLink: boolean;
  isChildrenManagedEventType?: boolean;
  isManagedEventType?: boolean;
  disableLocationProp?: boolean;
  getValues: UseFormGetValues<LocationFormValues>;
  setValue: UseFormSetValue<LocationFormValues>;
  control: Control<LocationFormValues>;
  formState: FormState<LocationFormValues>;
  eventType: TEventTypeLocation;
  locationOptions: TLocationOptions;
  prefillLocation?: SingleValueLocationOption;
};

const getLocationFromType = (type: EventLocationType["type"], locationOptions: TLocationOptions) => {
  for (const locationOption of locationOptions) {
    const option = locationOption.options.find((option) => option.value === type);
    if (option) {
      return option;
    }
  }
};

const getLocationInfo = ({
  eventType,
  locationOptions,
}: {
  eventType: TEventTypeLocation;
  locationOptions: TLocationOptions;
}) => {
  const locationAvailable =
    eventType.locations &&
    eventType.locations.length > 0 &&
    locationOptions.some((op) => op.options.find((opt) => opt.value === eventType.locations[0].type));
  const locationDetails = eventType.locations &&
    eventType.locations.length > 0 &&
    !locationAvailable && {
      slug: eventType.locations[0].type.replace("integrations:", "").replace(":", "-").replace("_video", ""),
      name: eventType.locations[0].type
        .replace("integrations:", "")
        .replace(":", " ")
        .replace("_video", "")
        .split(" ")
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" "),
    };
  return { locationAvailable, locationDetails };
};

const Locations: React.FC<LocationsProps> = ({
  isChildrenManagedEventType,
  disableLocationProp,
  isManagedEventType,
  getValues,
  setValue,
  control,
  formState,
  team,
  eventType,
  prefillLocation,
  ...props
}) => {
  const { t } = useLocale();
  const {
    fields: locationFields,
    append,
    remove,
    update: updateLocationField,
  } = useFieldArray({
    control,
    name: "locations",
  });

  const locationOptions = props.locationOptions.map((locationOption) => {
    const options = locationOption.options.filter((option) => {
      // Skip "Organizer's Default App" for non-team members
      return !team?.id ? option.label !== t("organizer_default_conferencing_app") : true;
    });

    return {
      ...locationOption,
      options,
    };
  });

  const [animationRef] = useAutoAnimate<HTMLUListElement>();
  const seatsEnabled = !!getValues("seatsPerTimeSlot");

  const validLocations =
    getValues("locations")?.filter((location) => {
      const eventLocation = getEventLocationType(location.type);
      if (!eventLocation) {
        // It's possible that the location app in use got uninstalled.
        return false;
      }
      return true;
    }) || [];

  const defaultValue = isManagedEventType
    ? locationOptions.find((op) => op.label === t("default"))?.options[0]
    : undefined;

  const { locationDetails, locationAvailable } = getLocationInfo({
    eventType,
    locationOptions: props.locationOptions,
  });

  const LocationInput = (props: {
    eventLocationType: EventLocationType;
    defaultValue?: string;
    index: number;
  }) => {
    const { eventLocationType, index, ...remainingProps } = props;
    if (eventLocationType?.organizerInputType === "text") {
      const { defaultValue, ...rest } = remainingProps;

      return (
        <Controller
          name={`locations.${index}.${eventLocationType.defaultValueVariable}`}
          defaultValue={defaultValue}
          render={({ field: { onChange, value } }) => {
            return (
              <Input
                name={`locations[${index}].${eventLocationType.defaultValueVariable}`}
                placeholder={t(eventLocationType.organizerInputPlaceholder || "")}
                type="text"
                required
                onChange={onChange}
                value={value}
                {...(disableLocationProp ? { disabled: true } : {})}
                className="my-0"
                {...rest}
              />
            );
          }}
        />
      );
    } else if (eventLocationType?.organizerInputType === "phone") {
      const { defaultValue, ...rest } = remainingProps;

      return (
        <Controller
          name={`locations.${index}.${eventLocationType.defaultValueVariable}`}
          defaultValue={defaultValue}
          render={({ field: { onChange, value } }) => {
            return (
              <PhoneInput
                required
                disabled={disableLocationProp}
                placeholder={t(eventLocationType.organizerInputPlaceholder || "")}
                name={`locations[${index}].${eventLocationType.defaultValueVariable}`}
                value={value}
                onChange={onChange}
                {...rest}
              />
            );
          }}
        />
      );
    }
    return null;
  };

  const [showEmptyLocationSelect, setShowEmptyLocationSelect] = useState(false);
  const defaultInitialLocation = defaultValue || null;
  const [selectedNewOption, setSelectedNewOption] = useState<SingleValueLocationOption | null>(
    defaultInitialLocation
  );

  useEffect(() => {
    if (!!prefillLocation) {
      const newLocationType = prefillLocation.value;

      const canAppendLocation = !validLocations.find((location) => location.type === newLocationType);

      if (canAppendLocation && !seatsEnabled) {
        append({
          type: newLocationType,
          credentialId: prefillLocation?.credentialId,
        });
        setSelectedNewOption(prefillLocation);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillLocation, seatsEnabled]);

  return (
    <div className="w-full">
      <ul ref={animationRef} className="space-y-2">
        {locationFields.map((field, index) => {
          const eventLocationType = getEventLocationType(field.type);
          const defaultLocation = field;

          const option = getLocationFromType(field.type, locationOptions);
          return (
            <li key={field.id}>
              <div className="flex w-full items-center">
                <LocationSelect
                  name={`locations[${index}].type`}
                  placeholder={t("select")}
                  options={locationOptions}
                  isDisabled={disableLocationProp}
                  defaultValue={option}
                  isSearchable={false}
                  className="block min-w-0 flex-1 rounded-sm text-sm"
                  menuPlacement="auto"
                  onChange={(e: SingleValueLocationOption) => {
                    setShowEmptyLocationSelect(false);
                    if (e?.value) {
                      const newLocationType = e.value;
                      const eventLocationType = getEventLocationType(newLocationType);
                      if (!eventLocationType) {
                        return;
                      }
                      const canAddLocation =
                        eventLocationType.organizerInputType ||
                        !validLocations?.find((location) => location.type === newLocationType);

                      if (canAddLocation) {
                        updateLocationField(index, {
                          type: newLocationType,
                          ...(e.credentialId && {
                            credentialId: e.credentialId,
                            teamName: e.teamName ?? undefined,
                          }),
                        });
                      } else {
                        updateLocationField(index, {
                          type: field.type,
                          ...(field.credentialId && {
                            credentialId: field.credentialId,
                            teamName: field.teamName ?? undefined,
                          }),
                        });
                        showToast(t("location_already_exists"), "warning");
                      }
                      // Whenever location changes, we need to reset the locations item in booking questions list else it overflows
                      // previously added values resulting in wrong behaviour
                      const existingBookingFields = getValues("bookingFields");
                      const findLocation = existingBookingFields.findIndex(
                        (field) => field.name === "location"
                      );
                      if (findLocation >= 0) {
                        existingBookingFields[findLocation] = {
                          ...existingBookingFields[findLocation],
                          type: "radioInput",
                          label: "",
                          placeholder: "",
                        };
                        setValue("bookingFields", existingBookingFields, {
                          shouldDirty: true,
                        });
                      }
                    }
                  }}
                />
                {!(disableLocationProp && isChildrenManagedEventType) && (
                  <button
                    data-testid={`delete-locations.${index}.type`}
                    className="min-h-9 block h-9 px-2"
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={t("remove")}>
                    <div className="h-4 w-4">
                      <Icon name="x" className="border-l-1 hover:text-emphasis text-subtle h-4 w-4" />
                    </div>
                  </button>
                )}
              </div>

              {eventLocationType?.organizerInputType && (
                <div className="mt-2 space-y-2">
                  <div className="w-full">
                    <div className="flex gap-2">
                      <div className="flex items-center justify-center">
                        <Icon name="corner-down-right" className="h-4 w-4" />
                      </div>
                      <LocationInput
                        data-testid={`${eventLocationType.type}-location-input`}
                        defaultValue={
                          defaultLocation
                            ? defaultLocation[eventLocationType.defaultValueVariable]
                            : undefined
                        }
                        eventLocationType={eventLocationType}
                        index={index}
                      />
                    </div>
                    <ErrorMessage
                      errors={formState.errors?.locations?.[index]}
                      name={eventLocationType.defaultValueVariable}
                      className="text-error my-1 ml-6 text-sm"
                      as="div"
                      id="location-error"
                    />
                  </div>
                  <div className="ml-6">
                    <CheckboxField
                      name={`locations[${index}].displayLocationPublicly`}
                      data-testid="display-location"
                      disabled={disableLocationProp}
                      defaultChecked={defaultLocation?.displayLocationPublicly}
                      description={t("display_location_label")}
                      onChange={(e) => {
                        const fieldValues = getValues("locations")[index];
                        updateLocationField(index, {
                          ...fieldValues,
                          displayLocationPublicly: e.target.checked,
                        });
                      }}
                      informationIconText={t("display_location_info_badge")}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {(validLocations.length === 0 || showEmptyLocationSelect) && (
          <div className="flex">
            <LocationSelect
              defaultMenuIsOpen={showEmptyLocationSelect}
              placeholder={t("select")}
              options={locationOptions}
              value={selectedNewOption}
              isDisabled={disableLocationProp}
              defaultValue={defaultValue}
              isSearchable={false}
              className="block w-full min-w-0 flex-1 rounded-sm text-sm"
              menuPlacement="auto"
              onChange={(e: SingleValueLocationOption) => {
                setShowEmptyLocationSelect(false);
                if (e?.value) {
                  const newLocationType = e.value;
                  const eventLocationType = getEventLocationType(newLocationType);
                  if (!eventLocationType) {
                    return;
                  }

                  const canAppendLocation =
                    eventLocationType.organizerInputType ||
                    !validLocations.find((location) => location.type === newLocationType);

                  if (canAppendLocation) {
                    append({
                      type: newLocationType,
                      ...(e.credentialId && {
                        credentialId: e.credentialId,
                        teamName: e.teamName ?? undefined,
                      }),
                    });
                    setSelectedNewOption(e);
                  } else {
                    showToast(t("location_already_exists"), "warning");
                    setSelectedNewOption(null);
                  }
                }
              }}
            />
          </div>
        )}
        {validLocations.some(
          (location) =>
            location.type === MeetLocationType && props.destinationCalendar?.integration !== "google_calendar"
        ) && (
          <div className="text-default flex items-center text-sm">
            <div className="mr-1.5 h-3 w-3">
              <Icon name="check" className="h-3 w-3" />
            </div>
            <p className="text-default text-sm">
              <Trans i18nKey="event_type_requires_google_calendar">
                The “Add to calendar” for this event type needs to be a Google Calendar for Meet to work.
                Connect it
                <Link className="cursor-pointer text-blue-500 underline" href="/apps/google-calendar">
                  here
                </Link>
                .
              </Trans>
            </p>
          </div>
        )}
        {isChildrenManagedEventType && !locationAvailable && locationDetails && (
          <p className="pl-1 text-sm leading-none text-red-600">
            {t("app_not_connected", { appName: locationDetails.name })}{" "}
            <a className="underline" href={`${WEBAPP_URL}/apps/${locationDetails.slug}`}>
              {t("connect_now")}
            </a>
          </p>
        )}
        {validLocations.length > 0 && !disableLocationProp && (
          //  && !isChildrenManagedEventType : Add this to hide add-location button only when location is disabled by Admin
          <li>
            <Button
              data-testid="add-location"
              StartIcon="plus"
              color="minimal"
              disabled={seatsEnabled}
              tooltip={seatsEnabled ? t("seats_option_doesnt_support_multi_location") : undefined}
              onClick={() => setShowEmptyLocationSelect(true)}>
              {t("add_location")}
            </Button>
          </li>
        )}
      </ul>
      {props.showAppStoreLink && (
        <p className="text-default mt-2 text-sm">
          <Trans i18nKey="cant_find_the_right_conferencing_app_visit_our_app_store">
            Can&apos;t find the right conferencing app? Visit our
            <Link className="cursor-pointer text-blue-500 underline" href="/apps/categories/conferencing">
              App Store
            </Link>
            .
          </Trans>
        </p>
      )}
    </div>
  );
};

export default Locations;
