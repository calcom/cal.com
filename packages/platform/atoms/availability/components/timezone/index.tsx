import { Controller } from "react-hook-form";

import { Skeleton, Label, TimezoneSelect } from "@calcom/ui";
import { SelectSkeletonLoader } from "@calcom/web/components/availability/SkeletonLoader";

export function Timezone() {
  return (
    <div>
      <Skeleton as={Label} htmlFor="timeZone" className="mb-0 inline-block leading-none">
        Timezone
      </Skeleton>
      <Controller
        name="timeZone"
        render={({ field: { onChange, value } }) =>
          value ? (
            <TimezoneSelect
              value={value}
              className="focus:border-brand-default border-default mt-1 block w-72 rounded-md text-sm"
              onChange={(timezone) => onChange(timezone.value)}
            />
          ) : (
            <SelectSkeletonLoader className="mt-1 w-72" />
          )
        }
      />
    </div>
  );
}
