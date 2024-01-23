import type { SingleValueProps } from "react-select";
import { components } from "react-select";

import { Badge } from "@calcom/ui";

import type { AvailabilityOption } from "../../types";

export function SingleValue({ ...props }: SingleValueProps<AvailabilityOption>) {
  const { label, isDefault, isManaged = false } = props.data;

  return (
    <components.SingleValue {...props}>
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
    </components.SingleValue>
  );
}
