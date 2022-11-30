import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { EventTypeSetupInfered, FormValues } from "pages/event-types/[type]";
import { useState } from "react";
import { Controller, useForm, useFormContext } from "react-hook-form";
import { MultiValue } from "react-select";
import { z } from "zod";

import { EventLocationType, getEventLocationType } from "@calcom/app-store/locations";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Icon, Label, Select, Skeleton, TextField, SettingsToggle } from "@calcom/ui";

import { slugify } from "@lib/slugify";

import { EditLocationDialog } from "@components/dialog/EditLocationDialog";

type OptionTypeBase = {
  label: string;
  value: EventLocationType["type"];
  disabled?: boolean;
};

export const EventSetupTab = (
  props: Pick<EventTypeSetupInfered, "eventType" | "locationOptions" | "team" | "teamMembers">
) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const { eventType, locationOptions, team } = props;
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocationType, setEditingLocationType] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<OptionTypeBase | undefined>(undefined);
  const [multipleDuration, setMultipleDuration] = useState(eventType.metadata.multipleDuration);

  const multipleDurationOptions = [
    { value: 5, label: t("multiple_duration_mins", { count: 5 }) },
    { value: 10, label: t("multiple_duration_mins", { count: 10 }) },
    { value: 15, label: t("multiple_duration_mins", { count: 15 }) },
    { value: 20, label: t("multiple_duration_mins", { count: 20 }) },
    { value: 25, label: t("multiple_duration_mins", { count: 25 }) },
    { value: 30, label: t("multiple_duration_mins", { count: 30 }) },
    { value: 45, label: t("multiple_duration_mins", { count: 45 }) },
    { value: 50, label: t("multiple_duration_mins", { count: 50 }) },
    { value: 60, label: t("multiple_duration_mins", { count: 60 }) },
    { value: 75, label: t("multiple_duration_mins", { count: 75 }) },
    { value: 80, label: t("multiple_duration_mins", { count: 80 }) },
    { value: 90, label: t("multiple_duration_mins", { count: 90 }) },
    { value: 120, label: t("multiple_duration_mins", { count: 120 }) },
    { value: 180, label: t("multiple_duration_mins", { count: 180 }) },
  ];

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
    setSelectedLocation(locationOptions.find((option) => option.value === type));
    setShowLocationModal(true);
  };

  const removeLocation = (selectedLocation: typeof eventType.locations[number]) => {
    formMethods.setValue(
      "locations",
      formMethods.getValues("locations").filter((location) => location.type !== selectedLocation.type),
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
      } else {
        copy[existingIdx] = {
          ...formMethods.getValues("locations")[existingIdx],
          ...details,
        };
      }

      formMethods.setValue("locations", copy);
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

    return (
      <div className="w-full">
        {validLocations.length === 0 && (
          <div className="flex">
            <Select
              options={locationOptions}
              isSearchable={false}
              className="block w-full min-w-0 flex-1 rounded-sm text-sm"
              onChange={(e) => {
                if (e?.value) {
                  const newLocationType: EventLocationType["type"] = e.value;
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
              return (
                <li key={location.type} className="mb-2 rounded-md border border-neutral-300 py-1.5 px-2">
                  <div className="flex max-w-full justify-between">
                    <div key={index} className="flex flex-grow items-center">
                      <img
                        src={eventLocationType.iconUrl}
                        className="h-4 w-4"
                        alt={`${eventLocationType.label} logo`}
                      />
                      <span className="truncate text-sm ltr:ml-1 rtl:mr-1">
                        {location[eventLocationType.defaultValueVariable] || eventLocationType.label}
                      </span>
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
                        className="mr-1 p-1 text-gray-500 hover:text-gray-900">
                        <Icon.FiEdit2 className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => removeLocation(location)} aria-label={t("remove")}>
                        <Icon.FiX className="border-l-1 h-6 w-6 pl-1 text-gray-500 hover:text-gray-900 " />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
            {validLocations.length > 0 && validLocations.length !== locationOptions.length && (
              <li>
                <Button StartIcon={Icon.FiPlus} color="minimal" onClick={() => setShowLocationModal(true)}>
                  {t("add_location")}
                </Button>
              </li>
            )}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="space-y-8">
        <TextField
          required
          label={t("Title")}
          defaultValue={eventType.title}
          {...formMethods.register("title")}
        />
        <TextField
          label={t("description")}
          placeholder={t("quick_video_meeting")}
          defaultValue={eventType.description ?? ""}
          {...formMethods.register("description")}
        />
        <TextField
          required
          label={t("URL")}
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
                onChange={(options) => {
                  const values = options
                    .map((opt) => opt.value)
                    .sort(function (a, b) {
                      return a - b;
                    });
                  setMultipleDuration(values);
                  setSelectedMultipleDuration(options);
                  if (!options.find((opt) => opt.value === defaultDuration?.value)) {
                    if (options.length > 0) {
                      setDefaultDuration(options[0]);
                    } else {
                      setDefaultDuration(null);
                    }
                  }
                  if (options.length === 1 && defaultDuration === null) {
                    setDefaultDuration(options[0]);
                  }
                  formMethods.setValue("metadata.multipleDuration", values);
                }}
              />
            </div>
            <div>
              <Skeleton as={Label} loadingClassName="w-16">
                {t("default_duration")}
              </Skeleton>
              <Select
                value={defaultDuration}
                isSearchable={false}
                name="length"
                className="text-sm"
                noOptionsMessage={() => t("default_duration_no_options")}
                options={selectedMultipleDuration}
                onChange={(option) => {
                  setDefaultDuration(
                    selectedMultipleDuration.find((opt) => opt.value === option?.value) ?? null
                  );
                  formMethods.setValue("length", Number(option?.value));
                }}
              />
            </div>
          </div>
        ) : (
          <TextField
            required
            name="length"
            type="number"
            label={t("duration")}
            addOnSuffix={<>{t("minutes")}</>}
            defaultValue={eventType.length ?? 15}
            onChange={(e) => {
              formMethods.setValue("length", Number(e.target.value));
            }}
          />
        )}
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
        <div>
          <Skeleton as={Label} loadingClassName="w-16">
            {t("location")}
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
        isOpenDialog={showLocationModal}
        setShowLocationModal={setShowLocationModal}
        saveLocation={saveLocation}
        defaultValues={formMethods.getValues("locations")}
        selection={
          selectedLocation ? { value: selectedLocation.value, label: selectedLocation.label } : undefined
        }
        setSelectedLocation={setSelectedLocation}
        setEditingLocationType={setEditingLocationType}
      />
    </div>
  );
};
