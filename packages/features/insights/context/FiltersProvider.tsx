import { useState } from "react";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";

import type { FilterContextType } from "./provider";
import { FilterProvider } from "./provider";

const stringToNumber = z.coerce
  .number()
  .optional()
  .transform((val) => {
    if (val !== undefined && isNaN(val)) return;
    return val;
  });

const filterQuerySchema = z.object({
  selectedTimeView: z.enum(["week", "month", "year"] as const).default("week"),
  selectedUserId: stringToNumber,
  selectedTeamId: stringToNumber,
  selectedTeamName: z.string().optional(),
  selectedEventTypeId: stringToNumber,
  selectedFilter: z
    .preprocess(
      (val) => (typeof val === "string" ? val.split(",") : val),
      z.enum(["user", "event-type"] as const).array()
    )
    .optional(),
  dateRange: z
    .preprocess(
      (val) => (typeof val === "string" ? val.split(",") : val),
      z.tuple([z.coerce.number(), z.coerce.number(), z.string().optional()])
    )
    .optional(),
});

export type FilterQuery = z.infer<typeof filterQuerySchema>;

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const { data, setQuery, removeByKey } = useTypedQuery(filterQuerySchema);

  const [selectedTimeView, setSelectedTimeView] = useState(data.selectedTimeView);
  const [selectedUserId, setSelectedUserId] = useState(data.selectedUserId);
  const [selectedTeamId, setSelectedTeamId] = useState(data.selectedTeamId);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState(data.selectedEventTypeId);
  const [selectedFilter, setSelectedFilter] = useState(data.selectedFilter);
  const [selectedTeamName, setSelectedTeamName] = useState(data.selectedTeamName);
  const [dateRange, setDateRange] = useState<FilterContextType["filter"]["dateRange"]>([
    Array.isArray(data.dateRange) ? dayjs(data.dateRange[0]) : dayjs().subtract(1, "month"),
    dayjs(data.dateRange?.[1]),
    data.dateRange?.[2] ?? "t",
  ] as const);

  function handleQueryChange<K extends keyof FilterQuery>(key: K, value: FilterQuery[K]) {
    if (key !== "selectedTimeView" && value === undefined) {
      removeByKey(key);
    } else {
      setQuery(key, value);
    }
  }

  return (
    <FilterProvider
      value={{
        filter: {
          dateRange,
          selectedTimeView,
          selectedUserId,
          selectedTeamId,
          selectedTeamName,
          selectedEventTypeId,
          selectedFilter,
        },
        setSelectedFilter: (filter) => {
          setSelectedFilter(filter);
          handleQueryChange("selectedFilter", filter);
        },
        setDateRange: (dateRange) => {
          setDateRange(dateRange);
          handleQueryChange("dateRange", [dateRange[0].valueOf(), dateRange[1].valueOf(), dateRange[2]]);
        },
        setSelectedTimeView: (selectedTimeView) => {
          setSelectedTimeView(selectedTimeView);
          handleQueryChange("selectedTimeView", selectedTimeView);
        },
        setSelectedUserId: (selectedUserId) => {
          setSelectedUserId(selectedUserId);
          handleQueryChange("selectedUserId", selectedUserId);
        },
        setSelectedTeamId: (selectedTeamId) => {
          setSelectedTeamId(selectedTeamId);
          handleQueryChange("selectedTeamId", selectedTeamId);
        },
        setSelectedTeamName: (selectedTeamName) => {
          setSelectedTeamName(selectedTeamName);
          handleQueryChange("selectedTeamName", selectedTeamName);
        },
        setSelectedEventTypeId: (selectedEventTypeId) => {
          setSelectedEventTypeId(selectedEventTypeId);
          handleQueryChange("selectedEventTypeId", selectedEventTypeId);
        },
      }}>
      {children}
    </FilterProvider>
  );
}
