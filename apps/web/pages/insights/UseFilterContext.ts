import { createContext, useContext } from "react";

import type { Dayjs } from "@calcom/dayjs";

export type FilterContextType = {
  filter: {
    dateRange: [Dayjs, Dayjs, null | string];
    selectedTimeView: "year" | "week" | "month";
    selectedFilter: Array<"user" | "event-type"> | null;
    selectedTeamId: number | null;
    selectedTeamName: string | null;
    selectedUserId: number | null;
    selectedEventTypeId: number | null;
  };
  setDateRange: ([start, end, range]: [Dayjs, Dayjs, null | string]) => void;
  setSelectedFilter: (filter: Array<"user" | "event-type"> | null) => void;
  setSelectedTeamId: (teamId: number | null) => void;
  setSelectedTeamName: (teamName: string | null) => void;
  setSelectedUserId: (userId: number | null) => void;
  setSelectedEventTypeId: (eventTypeId: number | null) => void;
  setSelectedTimeView: (timeView: "year" | "week" | "month") => void;
};

const FilterContext = createContext<FilterContextType | null>(null);

export function useFilterContext() {
  const context = useContext(FilterContext);

  if (!context) {
    throw new Error("useFilterContext must be used within a FilterProvider");
  }

  return context;
}

export default FilterContext;
