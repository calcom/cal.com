import { Controller } from "react-hook-form";

import { Skeleton, Label, TimezoneSelectComponent, SelectSkeletonLoader } from "@calcom/ui";

import useGetCityTimezones from "../../hooks/useGetCityTimezones";

export function Timezone({ title = "Timezone" }: { title?: string }) {
  const { isLoading, data } = useGetCityTimezones();

  return (
    <div>
      <Skeleton
        waitForTranslation={false}
        as={Label}
        htmlFor="timeZone"
        className="mb-0 inline-block leading-none">
        {title}
      </Skeleton>
      <Controller
        name="timeZone"
        render={({ field: { onChange, value } }) =>
          value ? (
            <TimezoneSelectComponent
              isPending={isLoading}
              data={data?.data.timeZones}
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
