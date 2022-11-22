import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { EventTypeSetupInfered, FormValues } from "pages/event-types/[type]";
import { useState } from "react";
import { Controller, useForm, useFormContext } from "react-hook-form";
import { z } from "zod";

import { getEventLocationType, EventLocationType } from "@calcom/app-store/locations";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/Icon";
import { Button } from "@calcom/ui/components";
import { Label, TextField } from "@calcom/ui/components/form";
import { Select, Skeleton } from "@calcom/ui/v2";

import { slugify } from "@lib/slugify";

import { EditLocationDialog } from "@components/eventtype/EditLocationDialog";

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
  const [selectedLocation, setSelectedLocation] = useState<OptionTypeBase | undefined>(undefined);

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

  const addLocation = (newLocationType: EventLocationType["type"], details = {}) => {
    const existingIdx = formMethods.getValues("locations").findIndex((loc) => newLocationType === loc.type);
    if (existingIdx !== -1) {
      const copy = formMethods.getValues("locations");
      copy[existingIdx] = {
        ...formMethods.getValues("locations")[existingIdx],
        ...details,
      };
      formMethods.setValue("locations", copy);
    } else {
      formMethods.setValue(
        "locations",
        formMethods.getValues("locations").concat({ type: newLocationType, ...details })
      );
    }
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
                    addLocation(newLocationType);
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
        saveLocation={addLocation}
        defaultValues={formMethods.getValues("locations")}
        selection={
          selectedLocation ? { value: selectedLocation.value, label: selectedLocation.label } : undefined
        }
        setSelectedLocation={setSelectedLocation}
      />
    </div>
  );
};
