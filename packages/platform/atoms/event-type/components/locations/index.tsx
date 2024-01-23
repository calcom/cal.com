import { ErrorMessage } from "@hookform/error-message";
import { LocationInput } from "event-type/components/location-input";
import getLocationFromType from "event-type/lib/getLocationFromType";
import getLocationInfo from "event-type/lib/getLocationInfo";
import type { EventTypeSetupProps } from "event-type/tabs/event-setup";
import type { FormValues } from "event-type/types";
import type { DestinationCalendar, Location } from "event-type/types";
import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";

import { getEventLocationType, MeetLocationType } from "@calcom/app-store/locations";
import { CAL_URL } from "@calcom/lib/constants";
import { Button, showToast } from "@calcom/ui";
import { Plus, Check, X, CornerDownRight } from "@calcom/ui/components/icon";

import CheckboxField from "../../../../../../apps/web/components/ui/form/CheckboxField";
import type { SingleValueLocationOption } from "../../../../../../apps/web/components/ui/form/LocationSelect";
import LocationSelect from "../../../../../../apps/web/components/ui/form/LocationSelect";

type LocationsProps = {
  eventTypeSetupProps: EventTypeSetupProps;
  formMethods: UseFormReturn<FormValues, any>;
  destinationCalendar: DestinationCalendar | null;
  locationOptions: any;
  shouldLockDisableProps: (fieldName: string) => { disabled: boolean; LockedIcon: false | JSX.Element };
  isManagedEventType: boolean;
  isChildrenManagedEventType: boolean;
};

// weird thing I noticed: for animation were using useAutoAnimate from formkit
// while everything regarding handling form is from react-hook-form

export function Locations({
  formMethods,
  destinationCalendar,
  isManagedEventType,
  isChildrenManagedEventType,
  locationOptions,
  shouldLockDisableProps,
  eventTypeSetupProps,
}: LocationsProps) {
  const {
    fields: locationFields,
    append,
    remove,
    update: updateLocationField,
  } = useFieldArray({
    control: formMethods.control,
    name: "locations",
  });
  // TODO: shift this a level up and then pass in as props
  const { locationDetails, locationAvailable } = getLocationInfo(eventTypeSetupProps);

  const validLocations = formMethods.getValues("locations").filter((location: Location) => {
    const eventLocation = getEventLocationType(location.type);
    if (!eventLocation) {
      // It's possible that the location app in use got uninstalled.
      return false;
    }
    return true;
  });
  const defaultValue = isManagedEventType
    ? locationOptions.find((op) => op.label === "Default")?.options[0]
    : undefined;

  const [showEmptyLocationSelect, setShowEmptyLocationSelect] = useState(false);
  const [selectedNewOption, setSelectedNewOption] = useState<SingleValueLocationOption | null>(null);

  return (
    <div className="w-full">
      <ul className="space-y-2">
        {locationFields.map((field, index) => {
          const eventLocationType = getEventLocationType(field.type);
          const defaultLocation = field;

          const option = getLocationFromType(field.type, locationOptions);

          return (
            <li key={field.id}>
              <div className="flex w-full items-center">
                <LocationSelect
                  placeholder="Select..."
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
                        !validLocations.find((location: Location) => location.type === newLocationType);
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
                        showToast("This Location already exists. Please select a new location", "warning");
                      }
                    }
                  }}
                />
                <button
                  data-testid={`delete-locations.${index}.type`}
                  className="min-h-9 block h-9 px-2"
                  type="button"
                  onClick={() => remove(index)}
                  aria-label="Remove">
                  <div className="h-4 w-4">
                    <X className="border-l-1 hover:text-emphasis text-subtle h-4 w-4" />
                  </div>
                </button>
              </div>
              {eventLocationType?.organizerInputType && (
                <div className="mt-2 space-y-2">
                  <div className="w-full">
                    <div className="flex gap-2">
                      <div className="flex items-center justify-center">
                        <CornerDownRight className="h-4 w-4" />
                      </div>
                      <LocationInput
                        formMethods={formMethods}
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
                      errors={formMethods.formState.errors.locations?.[index]}
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
                      defaultChecked={defaultLocation?.displayLocationPublicly}
                      description="Display on booking page"
                      onChange={(e) => {
                        const fieldValues = formMethods.getValues().locations[index];
                        updateLocationField(index, {
                          ...fieldValues,
                          displayLocationPublicly: e.target.checked,
                        });
                      }}
                      informationIconText="Location will be visible before the booking is confirmed"
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
              placeholder="Select..."
              options={locationOptions}
              value={selectedNewOption}
              isDisabled={shouldLockDisableProps("locations").disabled}
              defaultValue={defaultValue}
              isSearchable={false}
              className="block w-full min-w-0 flex-1 rounded-sm text-sm"
              menuPlacement="auto"
              onChange={(e: SingleValueLocationOption) => {
                // TODO: shift this method one level up and then pass as props
                if (e?.value) {
                  const newLocationType = e.value;
                  const eventLocationType = getEventLocationType(newLocationType);
                  if (!eventLocationType) {
                    return;
                  }

                  const canAppendLocation =
                    eventLocationType.organizerInputType ||
                    !validLocations.find((location: Location) => location.type === newLocationType);

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
                    showToast("This Location already exists. Please select a new location", "warning");
                    setSelectedNewOption(null);
                  }
                }
              }}
            />
          </div>
        )}
        {validLocations.some(
          (location: Location) =>
            location.type === MeetLocationType && destinationCalendar?.integration !== "google_calendar"
        ) && (
          <div className="text-default flex items-center text-sm">
            <div className="mr-1.5 h-3 w-3">
              <Check className="h-3 w-3" />
            </div>
            <p>
              The “Add to calendar” for this event type needs to be a Google Calendar for Meet to work. Change
              it {/* TODO: add correct tab name here */}
              <a href={`${CAL_URL}/event-types/${eventType.id}?tabName=advanced`} className="underline">
                here.
              </a>{" "}
            </p>
          </div>
        )}
        {isChildrenManagedEventType && !locationAvailable && locationDetails && (
          <p className="pl-1 text-sm leading-none text-red-600">
            You have not connected a {locationDetails.name} account.{" "}
            <a className="underline" href={`${CAL_URL}/apps/${locationDetails.slug}`}>
              Connect now
            </a>
          </p>
        )}
        {validLocations.length > 0 && !isManagedEventType && !isChildrenManagedEventType && (
          <li>
            <Button
              data-testid="add-location"
              StartIcon={Plus}
              color="minimal"
              onClick={() => setShowEmptyLocationSelect(true)}>
              Add a location
            </Button>
          </li>
        )}
      </ul>
      <p className="text-default mt-2 text-sm">
        Can&apos;t find the right video app? Visit our
        <a href={`${CAL_URL}/apps/categories/video`}>App Store</a>
      </p>
    </div>
  );
}
