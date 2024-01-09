import type { FormValues } from "event-type/types";
import { useFieldArray } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";

import { getEventLocationType } from "@calcom/app-store/locations";
import { Button } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

type LocationsProps = {
  formMethods: UseFormReturn<FormValues, any>;
  isManagedEventType: boolean;
  isChildrenManagedEventType: boolean;
};

// weird thing I noticed: for animation were using useAutoAnimate from formkit
// while everything regarding handling form is from react-hook-form

export function Locations({ formMethods, isManagedEventType, isChildrenManagedEventType }: LocationsProps) {
  const {
    fields: locationFields,
    append,
    remove,
    update: updateLocationField,
  } = useFieldArray({
    control: formMethods.control,
    name: "locations",
  });

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
      <ul className="space-y-2">
        {validLocations.length > 0 && !isManagedEventType && !isChildrenManagedEventType && (
          <li>
            <Button
              data-testid="add-location"
              StartIcon={Plus}
              color="minimal"
              // onClick={() => setShowEmptyLocationSelect(true)}
            >
              Add a location
            </Button>
          </li>
        )}
      </ul>
      <p className="text-default mt-2 text-sm">
        Can&apos;t find the right video app? Visit our
        {/* TODO: figure out correct url for app store */}
        <a href="https://app.cal.com/apps/categories/video">App Store</a>
      </p>
    </div>
  );
}
