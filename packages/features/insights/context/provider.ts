import * as React from "react";

import type { Dayjs } from "@calcom/dayjs";

interface IFilter {
  dateRange: [Dayjs, Dayjs, null | string];
  selectedTimeView?: "year" | "week" | "month";
  selectedFilter?: Array<"user" | "event-type"> | null;
  selectedTeamId?: number | null;
  selectedTeamName?: string | null;
  selectedUserId?: number | null;
  selectedMemberUserId?: number | null;
  selectedEventTypeId?: number | null;
  isAll?: boolean;
  initialConfig?: {
    teamId?: number | null;
    userId?: number | null;
    isAll?: boolean | null;
  };
}

export type FilterContextType = {
  filter: IFilter;
  clearFilters: () => void;
  setConfigFilters: (config: Partial<IFilter>) => void;
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
