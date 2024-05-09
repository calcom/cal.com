import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ErrorMessage } from "@hookform/error-message";
import { Trans } from "next-i18next";
import Link from "next/link";
import type { EventTypeSetupProps } from "pages/event-types/[type]";
import { useEffect, useState } from "react";
import { Controller, useFormContext, useFieldArray } from "react-hook-form";
import type { MultiValue } from "react-select";

import type { EventLocationType } from "@calcom/app-store/locations";
import { getEventLocationType, MeetLocationType } from "@calcom/app-store/locations";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import { slugify } from "@calcom/lib/slugify";
import turndown from "@calcom/lib/turndownService";
import {
  Label,
  Select,
  SettingsToggle,
  Skeleton,
  TextField,
  Icon,
  Editor,
  SkeletonContainer,
  SkeletonText,
  Input,
  PhoneInput,
  Button,
  showToast,
} from "@calcom/ui";

import CheckboxField from "@components/ui/form/CheckboxField";
import type { SingleValueLocationOption } from "@components/ui/form/LocationSelect";
import LocationSelect from "@components/ui/form/LocationSelect";

const getLocationFromType = (
  type: EventLocationType["type"],
  locationOptions: Pick<EventTypeSetupProps, "locationOptions">["locationOptions"]
) => {
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
}: Pick<EventTypeSetupProps, "eventType" | "locationOptions">) => {
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

const DescriptionEditor = ({ isEditable }: { isEditable: boolean }) => {
  const formMethods = useFormContext<FormValues>();
  const [mounted, setIsMounted] = useState(false);
  const { t } = useLocale();
  const [firstRender, setFirstRender] = useState(true);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return mounted ? (
    <Editor
      getText={() => md.render(formMethods.getValues("description") || "")}
      setText={(value: string) => formMethods.setValue("description", turndown(value), { shouldDirty: true })}
      excludedToolbarItems={["blockType"]}
      placeholder={t("quick_video_meeting")}
      editable={isEditable}
      firstRender={firstRender}
      setFirstRender={setFirstRender}
    />
  ) : (
    <SkeletonContainer>
      <SkeletonText className="block h-24 w-full" />
    </SkeletonContainer>
  );
};

export const EventSetupTab = (
  props: Pick<
    EventTypeSetupProps,
    "eventType" | "locationOptions" | "team" | "teamMembers" | "destinationCalendar"
  >
) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const { eventType, team, destinationCalendar } = props;
  const [multipleDuration, setMultipleDuration] = useState(
    formMethods.getValues("metadata")?.multipleDuration
  );
  const orgBranding = useOrgBranding();
  const seatsEnabled = formMethods.watch("seatsPerTimeSlotEnabled");

  const locationOptions = props.locationOptions.map((locationOption) => {
    const options = locationOption.options.filter((option) => {
      // Skip "Organizer's Default App" for non-team members
      return !team ? option.label !== t("organizer_default_conferencing_app") : true;
    });

    return {
      ...locationOption,
      options,
    };
  });

  const multipleDurationOptions = [
    5, 10, 15, 20, 25, 30, 45, 50, 60, 75, 80, 90, 120, 150, 180, 240, 300, 360, 420, 480,
  ].map((mins) => ({
    value: mins,
    label: t("multiple_duration_mins", { count: mins }),
  }));

  const [selectedMultipleDuration, setSelectedMultipleDuration] = useState<
    MultiValue<{
      value: number;
      label: string;
    }>
  >(multipleDurationOptions.filter((mdOpt) => multipleDuration?.includes(mdOpt.value)));
  const [defaultDuration, setDefaultDuration] = useState(
    selectedMultipleDuration.find((opt) => opt.value === formMethods.getValues("length")) ?? null
  );

  const { isChildrenManagedEventType, isManagedEventType, shouldLockIndicator, shouldLockDisableProps } =
    useLockedFieldsManager({ eventType, translate: t, formMethods });
  const Locations = () => {
    const { t } = useLocale();
    const {
      fields: locationFields,
      append,
      remove,
      update: updateLocationField,
    } = useFieldArray({
      control: formMethods.control,
      name: "locations",
    });

    const [animationRef] = useAutoAnimate<HTMLUListElement>();

    const validLocations = formMethods.getValues("locations").filter((location) => {
      const eventLocation = getEventLocationType(location.type);
      if (!eventLocation) {
        // It's possible that the location app in use got uninstalled.
        return false;
      }
      return true;
    });

    const defaultValue = isManagedEventType
      ? locationOptions.find((op) => op.label === t("default"))?.options[0]
      : undefined;

    const { locationDetails, locationAvailable } = getLocationInfo(props);

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
                  {...(shouldLockDisableProps("locations").disabled ? { disabled: true } : {})}
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
                  disabled={shouldLockDisableProps("locations").disabled}
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
                    isDisabled={shouldLockDisableProps("locations").disabled}
                    defaultValue={option}
                    isSearchable={false}
                    className="block min-w-0 flex-1 rounded-sm text-sm"
                    menuPlacement="auto"
                    onChange={(e: SingleValueLocationOption) => {
                      if (e?.value) {
                        const newLocationType = e.value;
                        const eventLocationType = getEventLocationType(newLocationType);
                        if (!eventLocationType) {
                          return;
                        }
                        const canAddLocation =
                          eventLocationType.organizerInputType ||
                          !validLocations.find((location) => location.type === newLocationType);

                        if (canAddLocation) {
                          updateLocationField(index, {
                            type: newLocationType,
                            ...(e.credentialId && {
                              credentialId: e.credentialId,
                              teamName: e.teamName,
                            }),
                          });
                        } else {
                          updateLocationField(index, {
                            type: field.type,
                            ...(field.credentialId && {
                              credentialId: field.credentialId,
                              teamName: field.teamName,
                            }),
                          });
                          showToast(t("location_already_exists"), "warning");
                        }
                        // Whenever location changes, we need to reset the locations item in booking questions list else it overflows
                        // previously added values resulting in wrong behaviour
                        const existingBookingFields = formMethods.getValues("bookingFields");
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
                          formMethods.setValue("bookingFields", existingBookingFields, {
                            shouldDirty: true,
                          });
                        }
                      }
                    }}
                  />
                  {!(shouldLockDisableProps("locations").disabled && isChildrenManagedEventType) && (
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
                        errors={formMethods.formState.errors?.locations?.[index]}
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
                        disabled={shouldLockDisableProps("locations").disabled}
                        defaultChecked={defaultLocation?.displayLocationPublicly}
                        description={t("display_location_label")}
                        onChange={(e) => {
                          const fieldValues = formMethods.getValues("locations")[index];
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
                isDisabled={shouldLockDisableProps("locations").disabled}
                defaultValue={defaultValue}
                isSearchable={false}
                className="block w-full min-w-0 flex-1 rounded-sm text-sm"
                menuPlacement="auto"
                onChange={(e: SingleValueLocationOption) => {
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
                          teamName: e.teamName,
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
              location.type === MeetLocationType && destinationCalendar?.integration !== "google_calendar"
          ) && (
            <div className="text-default flex items-center text-sm">
              <div className="mr-1.5 h-3 w-3">
                <Icon name="check" className="h-3 w-3" />
              </div>
              <Trans i18nKey="event_type_requres_google_cal">
                <p>
                  The “Add to calendar” for this event type needs to be a Google Calendar for Meet to work.
                  Change it{" "}
                  <Link
                    href={`${WEBAPP_URL}/event-types/${formMethods.getValues("id")}?tabName=advanced`}
                    className="underline">
                    here.
                  </Link>{" "}
                </p>
              </Trans>
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
          {validLocations.length > 0 && !shouldLockDisableProps("locations").disabled && (
            //  && !isChildrenManagedEventType : Add this to hide add-location button only when location is disabled by Admin
            <li>
              <Button
                data-testid="add-location"
                StartIcon="plus"
                color="minimal"
                onClick={() => setShowEmptyLocationSelect(true)}>
                {t("add_location")}
              </Button>
            </li>
          )}
        </ul>
        <p className="text-default mt-2 text-sm">
          <Trans i18nKey="cant_find_the_right_video_app_visit_our_app_store">
            Can&apos;t find the right video app? Visit our
            <Link className="cursor-pointer text-blue-500 underline" href="/apps/categories/video">
              App Store
            </Link>
            .
          </Trans>
        </p>
      </div>
    );
  };

  const lengthLockedProps = shouldLockDisableProps("length");
  const descriptionLockedProps = shouldLockDisableProps("description");
  const urlLockedProps = shouldLockDisableProps("slug");
  const titleLockedProps = shouldLockDisableProps("title");
  const urlPrefix = orgBranding
    ? orgBranding?.fullDomain.replace(/^(https?:|)\/\//, "")
    : `${WEBSITE_URL?.replace(/^(https?:|)\/\//, "")}`;

  return (
    <div>
      <div className="space-y-4">
        <div className="border-subtle space-y-6 rounded-lg border p-6">
          <TextField
            required
            label={t("title")}
            {...(isManagedEventType || isChildrenManagedEventType ? titleLockedProps : {})}
            defaultValue={eventType.title}
            data-testid="event-title"
            {...formMethods.register("title")}
          />
          <div>
            <Label htmlFor="editor">
              {t("description")}
              {(isManagedEventType || isChildrenManagedEventType) && shouldLockIndicator("description")}
            </Label>
            <DescriptionEditor isEditable={!descriptionLockedProps.disabled} />
          </div>
          <TextField
            required
            label={t("URL")}
            {...(isManagedEventType || isChildrenManagedEventType ? urlLockedProps : {})}
            defaultValue={eventType.slug}
            data-testid="event-slug"
            addOnLeading={
              <>
                {urlPrefix}/
                {!isManagedEventType
                  ? team
                    ? (orgBranding ? "" : "team/") + team.slug
                    : formMethods.getValues("users")[0].username
                  : t("username_placeholder")}
                /
              </>
            }
            {...formMethods.register("slug", {
              setValueAs: (v) => slugify(v),
            })}
          />
        </div>
        <div className="border-subtle rounded-lg border p-6">
          {multipleDuration ? (
            <div className="space-y-6">
              <div>
                <Skeleton as={Label} loadingClassName="w-16">
                  {t("available_durations")}
                </Skeleton>
                <Select
                  isMulti
                  defaultValue={selectedMultipleDuration}
                  name="metadata.multipleDuration"
                  isSearchable={false}
                  isDisabled={lengthLockedProps.disabled}
                  className="h-auto !min-h-[36px] text-sm"
                  options={multipleDurationOptions}
                  value={selectedMultipleDuration}
                  onChange={(options) => {
                    let newOptions = [...options];
                    newOptions = newOptions.sort((a, b) => {
                      return a?.value - b?.value;
                    });
                    const values = newOptions.map((opt) => opt.value);
                    setMultipleDuration(values);
                    setSelectedMultipleDuration(newOptions);
                    if (!newOptions.find((opt) => opt.value === defaultDuration?.value)) {
                      if (newOptions.length > 0) {
                        setDefaultDuration(newOptions[0]);
                        formMethods.setValue("length", newOptions[0].value, { shouldDirty: true });
                      } else {
                        setDefaultDuration(null);
                      }
                    }
                    if (newOptions.length === 1 && defaultDuration === null) {
                      setDefaultDuration(newOptions[0]);
                      formMethods.setValue("length", newOptions[0].value, { shouldDirty: true });
                    }
                    formMethods.setValue("metadata.multipleDuration", values, { shouldDirty: true });
                  }}
                />
              </div>
              <div>
                <Skeleton as={Label} loadingClassName="w-16">
                  {t("default_duration")}
                  {shouldLockIndicator("length")}
                </Skeleton>
                <Select
                  value={defaultDuration}
                  isSearchable={false}
                  name="length"
                  className="text-sm"
                  isDisabled={lengthLockedProps.disabled}
                  noOptionsMessage={() => t("default_duration_no_options")}
                  options={selectedMultipleDuration}
                  onChange={(option) => {
                    setDefaultDuration(
                      selectedMultipleDuration.find((opt) => opt.value === option?.value) ?? null
                    );
                    if (option) formMethods.setValue("length", option.value, { shouldDirty: true });
                  }}
                />
              </div>
            </div>
          ) : (
            <TextField
              required
              type="number"
              data-testid="duration"
              {...(isManagedEventType || isChildrenManagedEventType ? lengthLockedProps : {})}
              label={t("duration")}
              defaultValue={formMethods.getValues("length") ?? 15}
              {...formMethods.register("length")}
              addOnSuffix={<>{t("minutes")}</>}
              min={1}
            />
          )}
          {!lengthLockedProps.disabled && (
            <div className="!mt-4 [&_label]:my-1 [&_label]:font-normal">
              <SettingsToggle
                title={t("allow_booker_to_select_duration")}
                checked={multipleDuration !== undefined}
                disabled={seatsEnabled}
                tooltip={seatsEnabled ? t("seat_options_doesnt_multiple_durations") : undefined}
                onCheckedChange={() => {
                  if (multipleDuration !== undefined) {
                    setMultipleDuration(undefined);
                    setSelectedMultipleDuration([]);
                    setDefaultDuration(null);
                    formMethods.setValue("metadata.multipleDuration", undefined, { shouldDirty: true });
                    formMethods.setValue("length", eventType.length, { shouldDirty: true });
                  } else {
                    setMultipleDuration([]);
                    formMethods.setValue("metadata.multipleDuration", [], { shouldDirty: true });
                    formMethods.setValue("length", 0, { shouldDirty: true });
                  }
                }}
              />
            </div>
          )}
        </div>
        <div className="border-subtle rounded-lg border p-6">
          <div>
            <Skeleton as={Label} loadingClassName="w-16" htmlFor="locations">
              {t("location")}
              {/*improve shouldLockIndicator function to also accept eventType and then conditionally render
              based on Managed Event type or not.*/}
              {shouldLockIndicator("locations")}
            </Skeleton>
            <Controller
              name="locations"
              control={formMethods.control}
              defaultValue={eventType.locations || []}
              render={() => <Locations />}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
