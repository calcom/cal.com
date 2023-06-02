import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState } from "react";
import type { useForm } from "react-hook-form";

import type { EventLocationType } from "@calcom/app-store/locations";
import { getEventLocationType } from "@calcom/app-store/locations";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { Input, Button } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

import { SavedLocationField } from "@components/eventtype/SavedLocationField";
import LocationSelect from "@components/ui/form/LocationSelect";
import type { SingleValueLocationOption } from "@components/ui/form/LocationSelect";

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

const LocationInput = (props: {
  eventLocationType: EventLocationType;
  locationFormMethods: ReturnType<typeof useForm>;
  id: string;
  required: boolean;
  placeholder: string;
  className?: string;
  defaultValue?: string;
  closeFields: () => void;
}): JSX.Element | null => {
  const { eventLocationType, locationFormMethods, ...remainingProps } = props;
  return (
    <Input
      type="text"
      {...locationFormMethods.register(props.eventLocationType.variable)}
      {...remainingProps}
      onBlur={(e) => {
        const inputValue = e.target.value;
        console.log(inputValue, eventLocationType, "onBllur");
        const details = {
          [eventLocationType.defaultValueVariable]: inputValue,
        };
        // locationFormMethods.setValue(
        //   "locations",
        //   locationFormMethods
        //     .getValues("locations")
        //     .concat({ type: props.eventLocationType.type, ...details })
        // );
        props.saveLocation(props.eventLocationType.type, details);
        props.setSelectedLocation?.(undefined);
        locationFormMethods.unregister([
          "locationType",
          "locationLink",
          "locationAddress",
          "locationPhoneNumber",
        ]);
        props.closeFields();
      }}
    />
  );
};

export const AddLocation = (props) => {
  const { t } = useLocale();
  const state = {
    showLocationSelect: false,
    showAddressField: false,
    selectedLocationType: null as EventLocationType | null,
  };
  const [addLocationState, setAddLocationState] = useState(state);
  const [animateFieldRef] = useAutoAnimate<HTMLUListElement>();
  console.log(addLocationState, "ser");
  const defaultLocation = props.defaultValues?.find(
    (location: { type: EventLocationType["type"] }) => location.type === props.eventLocationType?.type
  );
  const validLocations = props.locationFormMethods.getValues("locations").filter((location) => {
    const eventLocation = getEventLocationType(location.type);
    if (!eventLocation) {
      return flase;
    }
    return true;
  });
  return (
    <div>
      {validLocations.length > 0 && (
        <ul>
          {validLocations.map((location, index) => {
            const eventLocationType = getEventLocationType(location.type);
            if (!eventLocationType) {
              return null;
            }
            const eventLabel = location[eventLocationType.defaultValueVariable] || t(eventLocationType.label);
            let showEditMode = false;
            if (props.selection) {
              if (props.selection.value === eventLocationType.type) {
                showEditMode = true;
              }
            }
            let showEditAddressSelect = eventLocationType.organizerInputType ? true : false;
            console.log(eventLocationType, props.selection, location, 'beees')
            return (
              <div>
                {showEditMode ? (
                  <div>
                    <div className="my-2 flex">
                      <LocationSelect
                        placeholder={t("select")}
                        options={props.locationOptions}
                        isSearchable={false}
                        className="block w-full min-w-0 flex-1 rounded-sm text-sm "
                        defaultValue={props.selection}
                        onChange={(e: SingleValueLocationOption) => {
                          if (e?.value) {
                            const latestLocationType = e.value;
                            const eventLocationType = getEventLocationType(latestLocationType);
                            if (!eventLocationType) {
                              return;
                            }
                            if (!eventLocationType?.organizerInputType) {
                              props.saveLocation(latestLocationType);
                            }
                            if (eventLocationType?.organizerInputType) {
                              showEditAddressSelect = true;
                            }
                          }
                        }}
                      />
                      <Button
                        onClick={() => {
                          // setShowLocationModal(false);
                          props.setSelectedLocation?.(undefined);
                          props.setEditingLocationType?.("");
                          props.locationFormMethods.unregister(["locationType", "locationLink"]);
                        }}
                        type="button"
                        className="mx-2"
                        color="secondary">
                        {t("cancel")}
                      </Button>
                    </div>
                    {showEditAddressSelect && (
                      <LocationInput
                        locationFormMethods={props.locationFormMethods}
                        ref={animateFieldRef}
                        eventLocationType={eventLocationType}
                        defaultValue={location[eventLocationType.defaultValueVariable]}
                        className="my-2 px-4"
                        id="locationInput"
                        required
                        closeFields={() => {
                          showEditAddressSelect = false;
                        }}
                        saveLocation={props.saveLocation}
                        setSelectedLocation={props.setSelectedLocation}
                      />
                    )}
                  </div>
                ) : (
                  <SavedLocationField
                    location={location}
                    index={index}
                    eventLocationType={eventLocationType}
                    eventLabel={eventLabel}
                    locationFormMethods={props.locationFormMethods}
                    setEditingLocationType={props.setEditingLocationType}
                    openLocationModal={props.openLocationModal}
                    removeLocation={props.removeLocation}
                  />
                )}
              </div>
            );
          })}
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
              console.log(latestLocationType, eventLocationType, "sss");
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
    </div>
  );
};
