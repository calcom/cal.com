import type { EventTypeSetupProps } from "pages/event-types/[type]";
import { useState, useEffect } from "react";
import type { useForm } from "react-hook-form";

import { getEventLocationType } from "@calcom/app-store/locations";
import type { EventLocationType } from "@calcom/app-store/locations";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

import { LocationInput } from "@components/eventtype/LocationInput";
import { SavedLocationField } from "@components/eventtype/SavedLocationField";
import type { SingleValueLocationOption } from "@components/ui/form/LocationSelect";
import LocationSelect from "@components/ui/form/LocationSelect";
import type { LocationOption } from "@components/ui/form/LocationSelect";

type Props = {
  location: EventLocationType["type"];
  selection: LocationOption;
  saveLocation: (newLocationType: EventLocationType["type"], details?: { [key: string]: string }) => void;
  setSelectedLocation?: (param: LocationOption | undefined) => void;
  locationFormMethods: ReturnType<typeof useForm>;
  removeLocation: (selectedLocation: EventTypeSetupProps["eventType"]["locations"][number]) => void;
};
export const EditLocation = (props: Props) => {
  const { t } = useLocale();
  const [showEditMode, setShowEditMode] = useState(false);
  const [showEditAddressSelect, setShowEditAddressSelect] = useState(false);
  const [inputLocationType, setInputLocationType] = useState(props?.selection?.value || null);
  const eventLocationType = getEventLocationType(props.location.type);
  useEffect(() => {
    if (props.selection) {
      setShowEditMode(props.selection.value === eventLocationType?.type);
    }
    if (eventLocationType?.organizerInputType) {
      setShowEditAddressSelect(true);
    }
  }, [props.selection, eventLocationType.type]);
  if (!eventLocationType) {
    return null;
  }
  const eventLabel = props.location[eventLocationType.defaultValueVariable] || t(eventLocationType.label);

  if (showEditMode) {
    return (
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
                  props.setSelectedLocation?.(undefined);
                  props.locationFormMethods.unregister([
                    "locationType",
                    "locationLink",
                    "locationAddress",
                    "locationPhoneNumber",
                    "phone",
                  ]);
                }
                if (eventLocationType?.organizerInputType) {
                  setInputLocationType(latestLocationType);
                  setShowEditAddressSelect(true);
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
          <div className="px-4">
            <LocationInput
              locationFormMethods={props.locationFormMethods}
              eventLocationType={eventLocationType}
              inputLocationType={inputLocationType}
              defaultValue={props.location[eventLocationType.defaultValueVariable]}
              className="my-2 px-4"
              id="locationInput"
              required
              closeFields={() => {
                setShowEditAddressSelect(false);
              }}
              saveLocation={props.saveLocation}
              setSelectedLocation={props.setSelectedLocation}
              inputFor="edit"
            />
          </div>
        )}
      </div>
    );
  } else {
    return (
      <SavedLocationField
        location={props.location}
        index={props.index}
        eventLocationType={eventLocationType}
        eventLabel={eventLabel}
        locationFormMethods={props.locationFormMethods}
        setEditingLocationType={props.setEditingLocationType}
        openLocationModal={props.openLocationModal}
        removeLocation={props.removeLocation}
      />
    );
  }
};
