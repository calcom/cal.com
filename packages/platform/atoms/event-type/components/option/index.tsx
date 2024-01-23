import type { OptionProps } from "react-select";
import { components } from "react-select";

import { Badge } from "@calcom/ui";

import type { AvailabilityOption } from "../../types";

export function Option({ ...props }: OptionProps<AvailabilityOption>) {
  const { label, isDefault, isManaged = false } = props.data;

  return (
    <components.Option {...props}>
      <span>{label}</span>
      {isDefault && (
        <Badge variant="blue" className="ml-2">
          Default
        </Badge>
      )}
      {isManaged && (
        <Badge variant="gray" className="ml-2">
          Managed
        </Badge>
      )}
    </components.Option>
  );
}
