import type { useForm } from "react-hook-form";

import { getEventLocationType } from "@calcom/app-store/locations";
import type { EventLocationType } from "@calcom/app-store/locations";
import { Input } from "@calcom/ui";

import type { LocationOption } from "@components/ui/form/LocationSelect";

export const LocationInput = (props: {
  eventLocationType: EventLocationType;
  locationFormMethods: ReturnType<typeof useForm>;
  id: string;
  required: boolean;
  placeholder: string;
  className?: string;
  defaultValue?: string;
  inputLocationType?: EventLocationType["type"];
  closeFields: () => void;
  saveLocation: (newLocationType: EventLocationType["type"], details: { [key: string]: string }) => void;
  setSelectedLocation?: (param: LocationOption | undefined) => void;
}): JSX.Element | null => {
  const { eventLocationType, locationFormMethods, ...remainingProps } = props;
  const inputlocationEventType = getEventLocationType(props.inputLocationType);
  if (props.inputFor === "edit") {
    return (
      <Input
        type="text"
        {...locationFormMethods.register(props.eventLocationType.variable)}
        {...remainingProps}
        onBlur={(e) => {
          const inputValue = e.target.value;
          const details = {
            [inputlocationEventType?.defaultValueVariable]: inputValue,
          };
          props.saveLocation(props.inputLocationType, details);
          props.setSelectedLocation?.(undefined);
          locationFormMethods.unregister([
            "locationType",
            "locationLink",
            "locationAddress",
            "locationPhoneNumber",
            "phone",
          ]);
          props.closeFields();
        }}
      />
    );
  } else {
    return (
      <Input
        type="text"
        {...locationFormMethods.register(props.eventLocationType.variable)}
        {...remainingProps}
        onBlur={(e) => {
          const inputValue = e.target.value;
          const details = {
            [eventLocationType.defaultValueVariable]: inputValue,
          };
          props.saveLocation(eventLocationType.type, details);
          props.setSelectedLocation?.(undefined);
          locationFormMethods.unregister([
            "locationType",
            "locationLink",
            "locationAddress",
            "locationPhoneNumber",
            "phone",
          ]);
          props.closeFields();
        }}
      />
    );
  }
};
