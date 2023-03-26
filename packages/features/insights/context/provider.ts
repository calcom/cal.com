import type { FilterQuery } from "insights/context/FiltersProvider";
import * as React from "react";

import type { Dayjs } from "@calcom/dayjs";

export type FilterContextType = {
  filter: Omit<FilterQuery, "dateRange"> & {
    dateRange: readonly [Dayjs, Dayjs, undefined | string];
  };
  setDateRange: ([start, end, range]: [Dayjs, Dayjs, undefined | string]) => void;
  setSelectedFilter: (filter: FilterQuery["selectedFilter"]) => void;
  setSelectedTeamId: (teamId: FilterQuery["selectedTeamId"]) => void;
  setSelectedTeamName: (teamName: FilterQuery["selectedTeamName"]) => void;
  setSelectedUserId: (userId: FilterQuery["selectedUserId"]) => void;
  setSelectedEventTypeId: (eventTypeId: FilterQuery["selectedEventTypeId"]) => void;
  setSelectedTimeView: (timeView: FilterQuery["selectedTimeView"]) => void;
};

export const FilterContext = React.createContext<FilterContextType | null>(null);

export function useFilterContext() {
  const context = React.useContext(FilterContext);

  if (!context) {
    throw new Error("useFilterContext must be used within a FilterProvider");
  }

  return context;
}

export function FilterProvider<F extends FilterContextType>(props: { value: F; children: React.ReactNode }) {
  return React.createElement(FilterContext.Provider, { value: props.value }, props.children);
}
