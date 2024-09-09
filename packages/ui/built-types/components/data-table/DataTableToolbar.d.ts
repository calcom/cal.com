/// <reference types="react" />
import type { Table } from "@tanstack/react-table";
import type { IconName } from "../icon/icon-names";
export type FilterableItems = {
    title: string;
    tableAccessor: string;
    options: {
        label: string;
        value: string;
        icon?: IconName;
    }[];
}[];
interface DataTableToolbarProps<TData> {
    table: Table<TData>;
    filterableItems?: FilterableItems;
    searchKey?: string;
    tableCTA?: React.ReactNode;
    onSearch?: (value: string) => void;
}
export declare function DataTableToolbar<TData>({ table, filterableItems, tableCTA, searchKey, onSearch, }: DataTableToolbarProps<TData>): JSX.Element;
export {};
//# sourceMappingURL=DataTableToolbar.d.ts.map