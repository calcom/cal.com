/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
export type IEventTypesFilters = RouterOutputs["viewer"]["eventTypes"]["listWithTeam"];
export type IEventTypeFilter = IEventTypesFilters[0];
export declare function FilterResults({ queryRes, SkeletonLoader, noResultsScreen, emptyScreen, children, }: {
    queryRes: {
        isPending: boolean;
        data: {
            totalCount: number;
            filtered: unknown[];
        } | undefined;
    };
    SkeletonLoader: React.FC;
    noResultsScreen: React.ReactNode;
    emptyScreen: React.ReactNode;
    children: React.ReactNode;
}): JSX.Element | null;
//# sourceMappingURL=FilterResults.d.ts.map