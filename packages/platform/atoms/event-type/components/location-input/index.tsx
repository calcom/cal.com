import { Phone } from "event-type/components/location-input/organization-input-type/phone";
import { Text } from "event-type/components/location-input/organization-input-type/text";
import type { FormValues } from "event-type/types";
import type { UseFormReturn } from "react-hook-form";

import type { EventLocationType } from "@calcom/app-store/locations";

export type formMethods = UseFormReturn<FormValues, any>;

type LocationInputProps = {
  eventLocationType: EventLocationType;
  formMethods: UseFormReturn<FormValues, any>;
  defaultValue?: string;
  index: number;
};

export function LocationInput(props: LocationInputProps) {
  const { eventLocationType, index, formMethods, ...remainingProps } = props;

  if (eventLocationType?.organizerInputType === "text") {
    const { defaultValue, ...rest } = remainingProps;

    return (
      <Text
        formMethods={formMethods}
        name={`locations.${index}.${eventLocationType.defaultValueVariable}`}
        defaultValue={defaultValue}
        inputName={`locations[${index}].${eventLocationType.defaultValueVariable}`}
        inputPlaceholder={
          eventLocationType.organizerInputPlaceholder ? eventLocationType.organizerInputPlaceholder : ""
        }
        otherProps={{ ...rest }}
      />
    );
  }

  if (eventLocationType?.organizerInputType === "phone") {
    const { defaultValue, ...rest } = remainingProps;

    return (
      <Phone
        formMethods={formMethods}
        name={`locations.${index}.${eventLocationType.defaultValueVariable}`}
        defaultValue={defaultValue}
        inputName={`locations[${index}].${eventLocationType.defaultValueVariable}`}
        inputPlaceholder={
          eventLocationType.organizerInputPlaceholder ? eventLocationType.organizerInputPlaceholder : ""
        }
        otherProps={{ ...rest }}
      />
    );
  }

  return null;
}
