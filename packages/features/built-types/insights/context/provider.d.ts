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
export declare const FilterContext: React.Context<FilterContextType | null>;
export declare function useFilterContext(): FilterContextType;
export declare function FilterProvider<F extends FilterContextType>(props: {
    value: F;
    children: React.ReactNode;
}): React.FunctionComponentElement<React.ProviderProps<FilterContextType | null>>;
export {};
//# sourceMappingURL=provider.d.ts.map