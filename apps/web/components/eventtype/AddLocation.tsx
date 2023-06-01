import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState } from "react";
import type { useForm } from "react-hook-form";

import type { EventLocationType } from "@calcom/app-store/locations";
import { getEventLocationType } from "@calcom/app-store/locations";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { Input, Button } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

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
        locationFormMethods.setValue(
          "locations",
          locationFormMethods
            .getValues("locations")
            .concat({ type: props.eventLocationType.type, ...details })
        );
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
  return (
    <div>
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
