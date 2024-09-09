/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
export type IEventTypesFilters = RouterOutputs["viewer"]["eventTypes"]["listWithTeam"];
export type IEventTypeFilter = IEventTypesFilters[0];
export declare const EventTypeFilter: () => JSX.Element | null;
//# sourceMappingURL=EventTypeFilter.d.ts.map