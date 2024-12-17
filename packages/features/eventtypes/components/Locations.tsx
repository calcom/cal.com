import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ErrorMessage } from "@hookform/error-message";
import { Trans } from "next-i18next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useFieldArray } from "react-hook-form";
import type { UseFormGetValues, UseFormSetValue, Control, FormState } from "react-hook-form";

import type { EventLocationType } from "@calcom/app-store/locations";
import { getEventLocationType, MeetLocationType } from "@calcom/app-store/locations";
import { useIsPlatform } from "@calcom/atoms/monorepo";
import type {
  LocationFormValues,
  EventTypeSetupProps,
  CheckboxClassNames,
} from "@calcom/features/eventtypes/lib/types";
import CheckboxField from "@calcom/features/form/components/CheckboxField";
import type {
  LocationSelectCustomClassNames,
  SingleValueLocationOption,
} from "@calcom/features/form/components/LocationSelect";
import LocationSelect from "@calcom/features/form/components/LocationSelect";
import { classNames } from "@calcom/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon, Input, PhoneInput, Button, showToast } from "@calcom/ui";

export type TEventTypeLocation = Pick<EventTypeSetupProps["eventType"], "locations">;
export type TLocationOptions = Pick<EventTypeSetupProps, "locationOptions">["locationOptions"];
export type TDestinationCalendar = { integration: string } | null;
export type TPrefillLocation = { credentialId?: number; type: string };

type LocationInputCustomClassNames = {
  addressInput?: string;
  phoneInput?: string;
};

export type LocationCustomClassNames = {
  container?: string;
  locationSelect?: LocationSelectCustomClassNames;
  removeLocationButton?: string;
  removeLocationIcon?: string;
  addLocationButton?: string;
  organizerContactInput?: {
    errorMessage?: string;
    locationInput?: LocationInputCustomClassNames;
    publicDisplayCheckbox?: CheckboxClassNames;
  };
};

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
  customClassNames?: LocationCustomClassNames;
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
  customClassNames,
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
    customClassNames?: LocationInputCustomClassNames;
  }) => {
    const { eventLocationType, index, customClassNames, ...remainingProps } = props;
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
                className={classNames("my-0", customClassNames?.addressInput)}
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
                className={customClassNames?.phoneInput}
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

  const isPlatorm = useIsPlatform();

  return (
    <div className={classNames("w-full", customClassNames?.container)}>
      <ul ref={animationRef} className={classNames("space-y-2")}>
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
                  className={classNames(
                    "block min-w-0 flex-1 rounded-sm text-sm",
                    customClassNames?.locationSelect?.selectWrapper
                  )}
                  customClassNames={customClassNames?.locationSelect}
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

                      const shouldUpdateLink =
                        eventLocationType?.organizerInputType === "text" &&
                        eventLocationType.defaultValueVariable === "link";

                      if (canAddLocation) {
                        updateLocationField(index, {
                          type: newLocationType,
                          ...(e.credentialId && {
                            credentialId: e.credentialId,
                            teamName: e.teamName ?? undefined,
                          }),
                          ...(shouldUpdateLink && {
                            link: "",
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
                    }
                  }}
                />
                {!(disableLocationProp && isChildrenManagedEventType) && (
                  <button
                    data-testid={`delete-locations.${index}.type`}
                    className={classNames("min-h-9 block h-9 px-2", customClassNames?.removeLocationButton)}
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={t("remove")}>
                    <div className="h-4 w-4">
                      <Icon
                        name="x"
                        className={classNames(
                          "border-l-1 hover:text-emphasis text-subtle h-4 w-4",
                          customClassNames?.removeLocationIcon
                        )}
                      />
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
                        customClassNames={customClassNames?.organizerContactInput?.locationInput}
                      />
                    </div>
                    <ErrorMessage
                      errors={formState.errors?.locations?.[index]}
                      name={eventLocationType.defaultValueVariable}
                      className={classNames(
                        "text-error my-1 ml-6 text-sm",
                        customClassNames?.organizerContactInput?.errorMessage
                      )}
                      as="div"
                      id="location-error"
                    />
                  </div>
                  <div
                    className={classNames(
                      "ml-6",
                      customClassNames?.organizerContactInput?.publicDisplayCheckbox?.container
                    )}>
                    <CheckboxField
                      name={`locations[${index}].displayLocationPublicly`}
                      data-testid="display-location"
                      disabled={disableLocationProp}
                      defaultChecked={defaultLocation?.displayLocationPublicly}
                      description={t("display_location_label")}
                      className={customClassNames?.organizerContactInput?.publicDisplayCheckbox?.checkbox}
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
              className={classNames(
                "block w-full min-w-0 flex-1 rounded-sm text-sm",
                customClassNames?.locationSelect?.selectWrapper
              )}
              customClassNames={customClassNames?.locationSelect}
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
              className={classNames(customClassNames?.addLocationButton)}
              tooltip={seatsEnabled ? t("seats_option_doesnt_support_multi_location") : undefined}
              onClick={() => setShowEmptyLocationSelect(true)}>
              {t("add_location")}
            </Button>
          </li>
        )}
      </ul>
      {props.showAppStoreLink && !isPlatorm && (
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
