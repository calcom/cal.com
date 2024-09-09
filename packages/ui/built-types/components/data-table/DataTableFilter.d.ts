/// <reference types="react" />
import type { Column } from "@tanstack/react-table";
import type { IconName } from "../..";
interface DataTableFilter<TData, TValue> {
    column?: Column<TData, TValue>;
    title?: string;
    options: {
        label: string;
        value: string;
        icon?: IconName;
    }[];
}
export declare function DataTableFilter<TData, TValue>({ column, title, options }: DataTableFilter<TData, TValue>): JSX.Element;
export {};
//# sourceMappingURL=DataTableFilter.d.ts.map