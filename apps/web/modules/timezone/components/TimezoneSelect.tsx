"use client";

import { SELECT_SEARCH_DATA, TimezoneSelectComponent } from "@calcom/features/timezone/components/TimezoneSelectComponent";
import { CALCOM_VERSION } from "@calcom/lib/constants";
import { trpc } from "@calcom/trpc/react";
import { useMemo } from "react";
import type { ITimezone, ITimezoneOption, Props as SelectProps } from "react-timezone-select";

export type TimezoneSelectProps = SelectProps & {
  variant?: "default" | "minimal";
  timezoneSelectCustomClassname?: string;
  size?: "sm" | "md";
  grow?: boolean;
};

export function TimezoneSelect(props: TimezoneSelectProps) {
  const { data = [], isPending } = trpc.viewer.timezones.cityTimezones.useQuery(
    {
      CalComVersion: CALCOM_VERSION,
    },
    {
      trpc: { context: { skipBatch: true } },
    }
  );

  const cityTimezonesFormatted = useMemo(
    () => data.map(({ city, timezone }) => ({ label: city, timezone })),
    [data]
  );

  const combinedData = useMemo(
    () => [...cityTimezonesFormatted, ...SELECT_SEARCH_DATA],
    [cityTimezonesFormatted]
  );

  return <TimezoneSelectComponent data={combinedData} isPending={isPending} {...props} />;
}

export type { ITimezone, ITimezoneOption };
