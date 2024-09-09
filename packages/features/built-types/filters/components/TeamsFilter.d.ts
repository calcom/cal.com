import type { InputHTMLAttributes, ReactNode } from "react";
import type { RouterOutputs } from "@calcom/trpc/react";
export type IEventTypesFilters = RouterOutputs["viewer"]["eventTypes"]["listWithTeam"];
export type IEventTypeFilter = IEventTypesFilters[0];
export declare const TeamsFilter: ({ popoverTriggerClassNames, useProfileFilter, showVerticalDivider, }: {
    popoverTriggerClassNames?: string | undefined;
    showVerticalDivider?: boolean | undefined;
    useProfileFilter?: boolean | undefined;
}) => JSX.Element | null;
export declare const FilterCheckboxFieldsContainer: ({ children, className, }: {
    children: ReactNode;
    className?: string | undefined;
}) => JSX.Element;
export declare const FilterCheckboxField: import("react").ForwardRefExoticComponent<InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    icon?: ReactNode;
} & import("react").RefAttributes<HTMLInputElement>>;
//# sourceMappingURL=TeamsFilter.d.ts.map