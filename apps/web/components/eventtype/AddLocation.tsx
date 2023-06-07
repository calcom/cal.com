import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { EventTypeSetupProps } from "pages/event-types/[type]";
import { useState } from "react";
import type { useForm } from "react-hook-form";

import type { EventLocationType, LocationObject } from "@calcom/app-store/locations";
import { getEventLocationType } from "@calcom/app-store/locations";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

import { EditLocation } from "@components/eventtype/EditLocation";
import { LocationInput } from "@components/eventtype/LocationInput";
import type { LocationOption } from "@components/ui/form/LocationSelect";
import LocationSelect from "@components/ui/form/LocationSelect";
import type { SingleValueLocationOption } from "@components/ui/form/LocationSelect";

type Props = {
  eventLocationType: EventLocationType;
  isChildrenManagedEventType: any;
  isManagedEventType: any;
  defaultValues: LocationObject[];
  locationFormMethods: ReturnType<typeof useForm>;
  selection: LocationOption;
  saveLocation: (newLocationType: EventLocationType["type"], details?: { [key: string]: string }) => void;
  setSelectedLocation?: (param: LocationOption | undefined) => void;
  openLocationModal: (type: EventLocationType["type"]) => void;
  removeLocation: (selectedLocation: EventTypeSetupProps["eventType"]["locations"][number]) => void;
};
export const AddLocation = (props: Props) => {
  const { t } = useLocale();
  const state = {
    showLocationSelect: false,
    showAddressField: false,
    selectedLocationType: null as EventLocationType | null,
  };
  const [addLocationState, setAddLocationState] = useState(state);
  const [animateFieldRef] = useAutoAnimate<HTMLUListElement>();
  const defaultLocation = props.defaultValues?.find(
    (location: { type: EventLocationType["type"] }) => location.type === props.eventLocationType?.type
  );
  const validLocations = props.locationFormMethods.getValues("locations").filter((location) => {
    const eventLocation = getEventLocationType(location.type);
    if (!eventLocation) {
      return false;
    }
    return true;
  });
  return (
    <div>
      {validLocations.length > 0 && (
        <ul>
          {validLocations.map((location, index: number) => (
            <EditLocation
              key={`${location}${index}`}
              location={location}
              index={index}
              selection={props.selection}
              locationOptions={props.locationOptions}
              saveLocation={props.saveLocation}
              setSelectedLocation={props.setSelectedLocation}
              setShowEditAddressSelect={props.setShowEditAddressSelect}
              setEditingLocationType={props.setEditingLocationType}
              locationFormMethods={props.locationFormMethods}
              openLocationModal={props.openLocationModal}
              removeLocation={props.removeLocation}
            />
          ))}
        </ul>
      )}
      {addLocationState.showLocationSelect && (
        <LocationSelect
          placeholder={t("select")}
          options={props.locationOptions}
          // defaultValue={props.defaultValues}
          isSearchable={false}
          className="block w-full min-w-0 flex-1 rounded-sm text-sm"
          onChange={(e: SingleValueLocationOption) => {
            if (e?.value) {
              const latestLocationType = e.value;
              const eventLocationType = getEventLocationType(latestLocationType);
              if (!eventLocationType?.organizerInputType) {
                props.saveLocation(latestLocationType);
                setAddLocationState((prevState) => ({
                  ...prevState,
                  showLocationSelect: false,
                }));
              }
              if (!eventLocationType) {
                return;
              }
              if (eventLocationType?.organizerInputType) {
                setAddLocationState((prevState) => ({
                  ...prevState,
                  showAddressField: true,
                  selectedLocationType: eventLocationType,
                }));
              }
            }
          }}
        />
      )}

      {addLocationState.showAddressField && (
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        <div className="px-4">
          <LocationInput
            eventLocationType={addLocationState.selectedLocationType}
            locationFormMethods={props.locationFormMethods}
            ref={animateFieldRef}
            id="locationInput"
            required
            placeholder={addLocationState.selectedLocationType?.messageForOrganizer}
            className="my-2"
            defaultValue={
              defaultLocation
                ? defaultLocation[addLocationState.selectedLocationType?.defaultValueVariable]
                : undefined
            }
            closeFields={() => {
              setAddLocationState((prevState) => ({
                ...prevState,
                showAddressField: false,
                showLocationSelect: false,
              }));
            }}
            saveLocation={props.saveLocation}
            setSelectedLocation={props.setSelectedLocation}
          />
        </div>
      )}
      {!props.isChildrenManagedEventType && !props.isManagedEventType && (
        <Button
          data-testid="add-location"
          StartIcon={Plus}
          color="minimal"
          onClick={() =>
            setAddLocationState({
              showLocationSelect: !addLocationState.showLocationSelect,
            })
          }>
          {!addLocationState.showLocationSelect ? "Add Location" : "Remove Location"}
        </Button>
      )}
    </div>
  );
};
