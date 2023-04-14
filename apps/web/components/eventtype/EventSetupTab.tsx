import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Trans } from "next-i18next";
import Link from "next/link";
import type { EventTypeSetupProps, FormValues } from "pages/event-types/[type]";
import { useEffect, useState } from "react";
import { Controller, useForm, useFormContext } from "react-hook-form";
import type { MultiValue } from "react-select";
import { z } from "zod";

import type { EventLocationType } from "@calcom/app-store/locations";
import { getEventLocationType, MeetLocationType, LocationType } from "@calcom/app-store/locations";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import { slugify } from "@calcom/lib/slugify";
import turndown from "@calcom/lib/turndownService";
import {
  Button,
  Label,
  Select,
  SettingsToggle,
  Skeleton,
  TextField,
  Editor,
  SkeletonContainer,
  SkeletonText,
} from "@calcom/ui";
import { Edit2, Check, X, Plus } from "@calcom/ui/components/icon";

import { EditLocationDialog } from "@components/dialog/EditLocationDialog";
import type { SingleValueLocationOption, LocationOption } from "@components/ui/form/LocationSelect";
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

const getLocationInfo = (props: Pick<EventTypeSetupProps, "eventType" | "locationOptions">) => {
  const locationAvailable =
    props.eventType.locations &&
    props.eventType.locations.length > 0 &&
    props.locationOptions.some((op) =>
      op.options.find((opt) => opt.value === props.eventType.locations[0].type)
    );
  const locationDetails = props.eventType.locations &&
    props.eventType.locations.length > 0 &&
    !locationAvailable && {
      slug: props.eventType.locations[0].type
        .replace("integrations:", "")
        .replace(":", "-")
        .replace("_video", ""),
      name: props.eventType.locations[0].type
        .replace("integrations:", "")
        .replace(":", " ")
        .replace("_video", "")
        .split(" ")
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" "),
    };
  return { locationAvailable, locationDetails };
};
interface DescriptionEditorProps {
  description?: string | null;
  editable?: boolean;
}

const DescriptionEditor = (props: DescriptionEditorProps) => {
  const formMethods = useFormContext<FormValues>();
  const [mounted, setIsMounted] = useState(false);
  const { t } = useLocale();
  const { description } = props;
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return mounted ? (
    <Editor
      getText={() => md.render(formMethods.getValues("description") || description || "")}
      setText={(value: string) => formMethods.setValue("description", turndown(value))}
      excludedToolbarItems={["blockType"]}
      placeholder={t("quick_video_meeting")}
      editable={props.editable}
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
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocationType, setEditingLocationType] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | undefined>(undefined);
  const [multipleDuration, setMultipleDuration] = useState(eventType.metadata.multipleDuration);

  const locationOptions = props.locationOptions.filter((option) => {
    return !team ? option.label !== "Conferencing" : true;
  });

  const multipleDurationOptions = [5, 10, 15, 20, 25, 30, 45, 50, 60, 75, 80, 90, 120, 180].map((mins) => ({
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
    selectedMultipleDuration.find((opt) => opt.value === eventType.length) ?? null
  );

  const openLocationModal = (type: EventLocationType["type"]) => {
    const option = getLocationFromType(type, locationOptions);
    setSelectedLocation(option);
    setShowLocationModal(true);
  };

  const removeLocation = (selectedLocation: (typeof eventType.locations)[number]) => {
    formMethods.setValue(
      "locations",
      formMethods.getValues("locations").filter((location) => {
        if (location.type === LocationType.InPerson) {
          return location.address !== selectedLocation.address;
        }
        return location.type !== selectedLocation.type;
      }),
      { shouldValidate: true }
    );
  };

  const saveLocation = (newLocationType: EventLocationType["type"], details = {}) => {
    const locationType = editingLocationType !== "" ? editingLocationType : newLocationType;
    const existingIdx = formMethods.getValues("locations").findIndex((loc) => locationType === loc.type);
    if (existingIdx !== -1) {
      const copy = formMethods.getValues("locations");
      if (editingLocationType !== "") {
        copy[existingIdx] = {
          ...details,
          type: newLocationType,
        };
      }

      formMethods.setValue("locations", [
        ...copy,
        ...(newLocationType === LocationType.InPerson && editingLocationType === ""
          ? [{ ...details, type: newLocationType }]
          : []),
      ]);
    } else {
      formMethods.setValue(
        "locations",
        formMethods.getValues("locations").concat({ type: newLocationType, ...details })
      );
    }

    setEditingLocationType("");
    setShowLocationModal(false);
  };

  const locationFormSchema = z.object({
    locationType: z.string(),
    locationAddress: z.string().optional(),
    displayLocationPublicly: z.boolean().optional(),
    locationPhoneNumber: z
      .string()
      .refine((val) => isValidPhoneNumber(val))
      .optional(),
    locationLink: z.string().url().optional(), // URL validates as new URL() - which requires HTTPS:// In the input field
  });

  const locationFormMethods = useForm<{
    locationType: EventLocationType["type"];
    locationPhoneNumber?: string;
    locationAddress?: string; // TODO: We should validate address or fetch the address from googles api to see if its valid?
    locationLink?: string; // Currently this only accepts links that are HTTPS://
    displayLocationPublicly?: boolean;
  }>({
    resolver: zodResolver(locationFormSchema),
  });

  const { isChildrenManagedEventType, isManagedEventType, shouldLockIndicator, shouldLockDisableProps } =
    useLockedFieldsManager(
      eventType,
      t("locked_fields_admin_description"),
      t("locked_fields_member_description")
    );

  const Locations = () => {
    const { t } = useLocale();

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

    return (
      <div className="w-full">
        {validLocations.length === 0 && (
          <div className="flex">
            <LocationSelect
              placeholder={t("select")}
              options={locationOptions}
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
                  locationFormMethods.setValue("locationType", newLocationType);
                  if (eventLocationType.organizerInputType) {
                    openLocationModal(newLocationType);
                  } else {
                    saveLocation(newLocationType);
                  }
                }
              }}
            />
          </div>
        )}
        {validLocations.length > 0 && (
          <ul ref={animationRef}>
            {validLocations.map((location, index) => {
              const eventLocationType = getEventLocationType(location.type);
              if (!eventLocationType) {
                return null;
              }

              const eventLabel =
                location[eventLocationType.defaultValueVariable] || t(eventLocationType.label);

              return (
                <li
                  key={`${location.type}${index}`}
                  className="border-default text-default mb-2 rounded-md border py-1.5 px-2 hover:cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <img
                        src={eventLocationType.iconUrl}
                        className="h-4 w-4"
                        alt={`${eventLocationType.label} logo`}
                      />
                      <span className="line-clamp-1 ms-1 text-sm">{eventLabel}</span>
                    </div>
                    <div className="flex">
                      <button
                        type="button"
                        onClick={() => {
                          locationFormMethods.setValue("locationType", location.type);
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
            })}
            {validLocations.some(
              (location) =>
                location.type === MeetLocationType && destinationCalendar?.integration !== "google_calendar"
            ) && (
              <div className="text-default flex text-sm">
                <Check className="mt-0.5 mr-1.5 h-2 w-2.5" />
                <Trans i18nKey="event_type_requres_google_cal">
                  <p>
                    The “Add to calendar” for this event type needs to be a Google Calendar for Meet to work.
                    Change it{" "}
                    <Link
                      href={`${CAL_URL}/event-types/${eventType.id}?tabName=advanced`}
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
                <a className="underline" href={`${CAL_URL}/apps/${locationDetails.slug}`}>
                  {t("connect_now")}
                </a>
              </p>
            )}
            {validLocations.length > 0 && !isManagedEventType && !isChildrenManagedEventType && (
              <li>
                <Button
                  data-testid="add-location"
                  StartIcon={Plus}
                  color="minimal"
                  onClick={() => setShowLocationModal(true)}>
                  {t("add_location")}
                </Button>
              </li>
            )}
          </ul>
        )}
      </div>
    );
  };

  const lengthLockedProps = shouldLockDisableProps("length");
  const descriptionLockedProps = shouldLockDisableProps("description");

  return (
    <div>
      <div className="space-y-8">
        <TextField
          required
          label={t("title")}
          {...shouldLockDisableProps("title")}
          defaultValue={eventType.title}
          {...formMethods.register("title")}
        />
        <div>
          <Label>
            {t("description")}
            {shouldLockIndicator("description")}
          </Label>
          <DescriptionEditor
            description={eventType?.description}
            editable={!descriptionLockedProps.disabled}
          />
        </div>
        <TextField
          required
          label={t("URL")}
          {...shouldLockDisableProps("slug")}
          defaultValue={eventType.slug}
          addOnLeading={
            <>
              {CAL_URL?.replace(/^(https?:|)\/\//, "")}/
              {team ? "team/" + team.slug : eventType.users[0].username}/
            </>
          }
          {...formMethods.register("slug", {
            setValueAs: (v) => slugify(v),
          })}
        />
        {multipleDuration ? (
          <div className="space-y-4">
            <div>
              <Skeleton as={Label} loadingClassName="w-16">
                {t("available_durations")}
              </Skeleton>
              <Select
                isMulti
                defaultValue={selectedMultipleDuration}
                name="metadata.multipleDuration"
                isSearchable={false}
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
                      formMethods.setValue("length", newOptions[0].value);
                    } else {
                      setDefaultDuration(null);
                    }
                  }
                  if (newOptions.length === 1 && defaultDuration === null) {
                    setDefaultDuration(newOptions[0]);
                    formMethods.setValue("length", newOptions[0].value);
                  }
                  formMethods.setValue("metadata.multipleDuration", values);
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
                  if (option) formMethods.setValue("length", option.value);
                }}
              />
            </div>
          </div>
        ) : (
          <TextField
            required
            type="number"
            {...lengthLockedProps}
            label={t("duration")}
            defaultValue={eventType.length ?? 15}
            {...formMethods.register("length")}
            addOnSuffix={<>{t("minutes")}</>}
          />
        )}
        {!lengthLockedProps.disabled && (
          <div className="!mt-4 [&_label]:my-1 [&_label]:font-normal">
            <SettingsToggle
              title={t("allow_booker_to_select_duration")}
              checked={multipleDuration !== undefined}
              onCheckedChange={() => {
                if (multipleDuration !== undefined) {
                  setMultipleDuration(undefined);
                  formMethods.setValue("metadata.multipleDuration", undefined);
                  formMethods.setValue("length", eventType.length);
                } else {
                  setMultipleDuration([]);
                  formMethods.setValue("metadata.multipleDuration", []);
                  formMethods.setValue("length", 0);
                }
              }}
            />
          </div>
        )}
        <div>
          <Skeleton as={Label} loadingClassName="w-16">
            {t("location")}
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

      {/* We portal this modal so we can submit the form inside. Otherwise we get issues submitting two forms at once  */}
      <EditLocationDialog
        isTeamEvent={!!team}
        isOpenDialog={showLocationModal}
        setShowLocationModal={setShowLocationModal}
        saveLocation={saveLocation}
        defaultValues={formMethods.getValues("locations")}
        selection={
          selectedLocation
            ? { value: selectedLocation.value, label: t(selectedLocation.label), icon: selectedLocation.icon }
            : undefined
        }
        setSelectedLocation={setSelectedLocation}
        setEditingLocationType={setEditingLocationType}
      />
    </div>
  );
};
