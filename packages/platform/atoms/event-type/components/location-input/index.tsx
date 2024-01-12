import type { FormValues } from "event-type/types";
import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";

import type { EventLocationType } from "@calcom/app-store/locations";
import { Input, PhoneInput } from "@calcom/ui";

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
      <Controller
        control={formMethods.control}
        name={`locations.${index}.${eventLocationType.defaultValueVariable}`}
        defaultValue={defaultValue}
        render={({ field: { onChange, value } }) => {
          return (
            <Input
              name={`locations[${index}].${eventLocationType.defaultValueVariable}`}
              placeholder={
                eventLocationType.organizerInputPlaceholder ? eventLocationType.organizerInputPlaceholder : ""
              }
              type="text"
              required
              onChange={onChange}
              value={value}
              className="my-0"
              {...rest}
            />
          );
        }}
      />
    );
  }

  if (eventLocationType?.organizerInputType === "phone") {
    const { defaultValue, ...rest } = remainingProps;

    return (
      <Controller
        control={formMethods.control}
        name={`locations.${index}.${eventLocationType.defaultValueVariable}`}
        defaultValue={defaultValue}
        render={({ field: { onChange, value } }) => {
          return (
            <PhoneInput
              required
              placeholder={
                eventLocationType.organizerInputPlaceholder ? eventLocationType.organizerInputPlaceholder : ""
              }
              name={`locations[${index}].${eventLocationType.defaultValueVariable}`}
              value={value}
              onChange={onChange}
              {...rest}
            />
          );
        }}
      />
    );
  }

  return null;
}
