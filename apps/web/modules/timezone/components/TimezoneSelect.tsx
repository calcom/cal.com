"use client";

import { TimezoneSelectComponent } from "@calcom/features/timezone/components/TimezoneSelectComponent";
import { CALCOM_VERSION } from "@calcom/lib/constants";
import type { Timezones } from "@calcom/lib/timezone";
import { trpc } from "@calcom/trpc/react";
import { useMemo } from "react";
import type { Props as SelectProps } from "react-timezone-select";

const SELECT_SEARCH_DATA: Timezones = [
  { label: "San Francisco", timezone: "America/Los_Angeles" },
  { label: "Sao Francisco do Sul", timezone: "America/Sao_Paulo" },
  { label: "San Francisco de Macoris", timezone: "America/Santo_Domingo" },
  { label: "San Francisco Gotera", timezone: "America/El_Salvador" },
  { label: "Eastern Time - US & Canada", timezone: "America/New_York" },
  { label: "Pacific Time - US & Canada", timezone: "America/Los_Angeles" },
  { label: "Central Time - US & Canada", timezone: "America/Chicago" },
  { label: "Mountain Time - US & Canada", timezone: "America/Denver" },
  { label: "Atlantic Time - Canada", timezone: "America/Halifax" },
  { label: "Eastern European Time", timezone: "Europe/Bucharest" },
  { label: "Central European Time", timezone: "Europe/Berlin" },
  { label: "Western European Time", timezone: "Europe/London" },
  { label: "Australian Eastern Time", timezone: "Australia/Sydney" },
  { label: "Japan Standard Time", timezone: "Asia/Tokyo" },
  { label: "India Standard Time", timezone: "Asia/Kolkata" },
  { label: "Gulf Standard Time", timezone: "Asia/Dubai" },
  { label: "South Africa Standard Time", timezone: "Africa/Johannesburg" },
  { label: "Brazil Time", timezone: "America/Sao_Paulo" },
  { label: "Hawaii-Aleutian Standard Time", timezone: "Pacific/Honolulu" },
];

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
