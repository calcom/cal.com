import getLocationInfo from "event-type/lib/getLocationIndo";
import type { EventTypeSetupProps } from "event-type/tabs/event-setup";
import type { FormValues } from "event-type/types";
import type { DestinationCalendar, Location } from "event-type/types";
import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";

import { getEventLocationType, MeetLocationType } from "@calcom/app-store/locations";
import { CAL_URL } from "@calcom/lib/constants";
import { Button } from "@calcom/ui";
import { Plus, Check } from "@calcom/ui/components/icon";

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
    ? locationOptions.find((op) => op.label === t("default"))?.options[0]
    : undefined;

  const [showEmptyLocationSelect, setShowEmptyLocationSelect] = useState(false);
  const [selectedNewOption, setSelectedNewOption] = useState<SingleValueLocationOption | null>(null);

  return (
    <div className="w-full">
      <ul className="space-y-2">
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
                if (e?.value) {
                  const newLocationType = e.value;
                  const eventLocationType = getEventLocationType(newLocationType);
                  if (!eventLocationType) {
                    return;
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
