import { Locations } from "event-type/components/locations";
import type { FormValues } from "event-type/types";
import { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { slugify } from "@calcom/lib/slugify";
import { TextField, Label, Skeleton, SettingsToggle, Select } from "@calcom/ui";

import { DescriptionEditor } from "../../components/description-editor";

export type EventTypeSetupProps = {
  eventType: any;
  locationOptions: any;
  team: any;
  teamMembers: any;
  destinationCalendar: [];
};

export function EventSetup(
  props: Pick<
    EventTypeSetupProps,
    "eventType" | "locationOptions" | "team" | "teamMembers" | "destinationCalendar"
  >
) {
  const formMethods = useFormContext<FormValues>();
  const { eventType, team, destinationCalendar } = props;
  const [multipleDuration, setMultipleDuration] = useState(eventType.metadata?.multipleDuration);
  const seatsEnabled = formMethods.watch("seatsPerTimeSlotEnabled");

  const { isChildrenManagedEventType, isManagedEventType, shouldLockIndicator, shouldLockDisableProps } =
    useLockedFieldsManager(
      eventType,
      "Members will not be able to edit this",
      "This option was locked by the team admin"
    );

  const lengthLockedProps = shouldLockDisableProps("length");
  const descriptionLockedProps = shouldLockDisableProps("description");

  return (
    <div>
      <div className="space-y-4">
        <div className="border-subtle space-y-6 rounded-lg border p-6">
          <TextField
            required
            label="Title"
            {...shouldLockDisableProps("title")}
            defaultValue={eventType.title}
            {...formMethods.register("title")}
          />
          <div>
            <Label>
              Description
              {shouldLockIndicator("description")}
            </Label>
            <DescriptionEditor
              description={eventType?.description}
              editable={!descriptionLockedProps.disabled}
            />
          </div>
          <TextField
            required
            label="URL"
            {...shouldLockDisableProps("slug")}
            defaultValue={eventType.slug}
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
                  Available durations
                </Skeleton>
                <Select
                  isMulti
                  // defaultValue={selectedMultipleDuration}
                  name="metadata.multipleDuration"
                  isSearchable={false}
                  className="h-auto !min-h-[36px] text-sm"
                  // options={multipleDurationOptions}
                  // value={selectedMultipleDuration}
                  onChange={(options: any) => {
                    let newOptions = [...options];
                    newOptions = newOptions.sort((a, b) => {
                      return a?.value - b?.value;
                    });
                    const values = newOptions.map((opt) => opt.value);
                    setMultipleDuration(values);
                    // setSelectedMultipleDuration(newOptions);
                    if (!newOptions.find((opt) => opt.value === defaultDuration?.value)) {
                      if (newOptions.length > 0) {
                        // setDefaultDuration(newOptions[0]);
                        formMethods.setValue("length", newOptions[0].value);
                      } else {
                        // setDefaultDuration(null);
                      }
                    }
                    if (newOptions.length === 1 && defaultDuration === null) {
                      // setDefaultDuration(newOptions[0]);
                      formMethods.setValue("length", newOptions[0].value);
                    }
                    formMethods.setValue("metadata.multipleDuration", values);
                  }}
                />
              </div>
              <div>
                <Skeleton as={Label} loadingClassName="w-16">
                  Default duration
                  {shouldLockIndicator("length")}
                </Skeleton>
                <Select
                  // value={defaultDuration}
                  isSearchable={false}
                  name="length"
                  className="text-sm"
                  isDisabled={lengthLockedProps.disabled}
                  noOptionsMessage={() => `Please choose available durations first`}
                  // options={selectedMultipleDuration}
                  onChange={(option) => {
                    // setDefaultDuration(
                    //   selectedMultipleDuration.find((opt) => opt.value === option?.value) ?? null
                    // );
                    // if (option) formMethods.setValue("length", option.value);
                  }}
                />
              </div>
            </div>
          ) : (
            <TextField />
          )}
          {!lengthLockedProps.disabled && (
            <div className="!mt-4 [&_label]:my-1 [&_label]:font-normal">
              <SettingsToggle
                title="Allow booker to select duration"
                checked={multipleDuration !== undefined}
                disabled={seatsEnabled}
                tooltip={seatsEnabled ? `Seat option doesn't support multiple durations` : undefined}
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
        </div>

        <div className="border-subtle rounded-lg border p-6">
          <div>
            <Skeleton as={Label} loadingClassName="w-16">
              Location
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
}
