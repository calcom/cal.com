import { ErrorMessage } from "@hookform/error-message";
import { useFieldArray, useFormContext } from "react-hook-form";

import { getEventLocationType } from "@calcom/app-store/locations";
import type { LocationFormValues, FormValues } from "@calcom/features/eventtypes/lib/types";
import CheckboxField from "@calcom/features/form/components/CheckboxField";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { TextField } from "@calcom/ui/components/form";

import LocationInput from "./LocationInput";
import LocationOptionContainer from "./LocationSettingsContainer";
import type { LocationCustomClassNames } from "./types";

const DefaultLocationSettings = ({
  field,
  index,
  disableLocationProp,
  customClassNames,
}: {
  field: LocationFormValues["locations"][number];
  index: number;
  disableLocationProp?: boolean;
  customClassNames?: LocationCustomClassNames;
}) => {
  const { t } = useLocale();
  const { getValues, control, formState } = useFormContext<FormValues>();
  const { update: updateLocationField } = useFieldArray({
    control,
    name: "locations",
  });
  const defaultLocation = field;
  const eventLocationType = getEventLocationType(field.type);

  if (!eventLocationType) return null;

  return (
    <LocationOptionContainer>
      <LocationInput
        label={"organizerInputLabel" in eventLocationType ? eventLocationType?.organizerInputLabel : null}
        data-testid={`${eventLocationType.type}-location-input`}
        defaultValue={defaultLocation ? defaultLocation[eventLocationType.defaultValueVariable] : undefined}
        eventLocationType={eventLocationType}
        index={index}
        customClassNames={customClassNames?.organizerContactInput?.locationInput}
        disableLocationProp={disableLocationProp}
      />
      <ErrorMessage
        errors={formState.errors?.locations?.[index]}
        name={eventLocationType.defaultValueVariable}
        className={classNames(
          "text-error my-1 ml-6 text-sm",
          customClassNames?.organizerContactInput?.errorMessage
        )}
        as="div"
        id="location-error"
      />
      {eventLocationType.organizerInputType && (
        <CheckboxField
          name={`locations[${index}].displayLocationPublicly`}
          data-testid="display-location"
          disabled={disableLocationProp}
          defaultChecked={defaultLocation?.displayLocationPublicly}
          description={t("display_location_label")}
          className={customClassNames?.organizerContactInput?.publicDisplayCheckbox?.checkbox}
          onChange={(e) => {
            const fieldValues = getValues("locations")[index];
            updateLocationField(index, {
              ...fieldValues,
              displayLocationPublicly: e.target.checked,
            });
          }}
          informationIconText={t("display_location_info_badge")}
        />
      )}
      {eventLocationType?.supportsCustomLabel && (
        <TextField
          label={t("location_custom_label_input_label")}
          name={`locations[${index}].customLabel`}
          type="text"
          defaultValue={defaultLocation?.customLabel}
          onChange={(e) => {
            const fieldValues = getValues("locations")[index];
            updateLocationField(index, {
              ...fieldValues,
              customLabel: e.target.value,
            });
          }}
        />
      )}
    </LocationOptionContainer>
  );
};

export default DefaultLocationSettings;
