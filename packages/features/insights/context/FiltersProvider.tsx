import { useState } from "react";

import dayjs from "@calcom/dayjs";

import type { FilterContextType } from "./provider";
import { FilterProvider } from "./provider";

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  // TODO: Sync insight filters with URL parameters
  const [selectedTimeView, setSelectedTimeView] =
    useState<FilterContextType["filter"]["selectedTimeView"]>("week");
  const [selectedUserId, setSelectedUserId] = useState<FilterContextType["filter"]["selectedUserId"]>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<FilterContextType["filter"]["selectedTeamId"]>(null);
  const [selectedEventTypeId, setSelectedEventTypeId] =
    useState<FilterContextType["filter"]["selectedEventTypeId"]>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterContextType["filter"]["selectedFilter"]>(null);
  const [selectedTeamName, setSelectedTeamName] =
    useState<FilterContextType["filter"]["selectedTeamName"]>(null);
  const [dateRange, setDateRange] = useState<FilterContextType["filter"]["dateRange"]>([
    dayjs().subtract(1, "month"),
    dayjs(),
    "t",
  ]);
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
        setSelectedFilter: (filter) => setSelectedFilter(filter),
        setDateRange: (dateRange) => setDateRange(dateRange),
        setSelectedTimeView: (selectedTimeView) => setSelectedTimeView(selectedTimeView),
        setSelectedUserId: (selectedUserId) => setSelectedUserId(selectedUserId),
        setSelectedTeamId: (selectedTeamId) => setSelectedTeamId(selectedTeamId),
        setSelectedTeamName: (selectedTeamName) => setSelectedTeamName(selectedTeamName),
        setSelectedEventTypeId: (selectedEventTypeId) => setSelectedEventTypeId(selectedEventTypeId),
      }}>
      {children}
    </FilterProvider>
  );
}
