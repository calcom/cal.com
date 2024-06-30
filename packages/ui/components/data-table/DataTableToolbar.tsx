"use client";

import type { Table } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button } from "../button";
import { Input } from "../form";
import { DataTableFilter } from "./DataTableFilter";

export type FilterableItems = {
  title: string;
  tableAccessor: string;
  options: {
    label: string;
    value: string;
    icon?: LucideIcon;
  }[];
}[];

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  filterableItems?: FilterableItems;
  searchKey?: string;
  tableCTA?: React.ReactNode;
  onSearch?: (value: string) => void;
}

export function DataTableToolbar<TData>({
  table,
  filterableItems,
  tableCTA,
  searchKey,
  onSearch,
}: DataTableToolbarProps<TData>) {
  // TODO: Is there a better way to check if the table is filtered?
  // If you select ALL filters for a column, the table is not filtered and we dont get a reset button
  const isFiltered = table.getState().columnFilters.length > 0;
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    onSearch?.(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

  const { t } = useLocale();

  return (
    <div className="flex items-center justify-end  py-4">
      {searchKey && (
        <Input
          className="max-w-64 mb-0 mr-auto rounded-md"
          placeholder="Search"
          value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn(searchKey)?.setFilterValue(event.target.value.trim())}
        />
      )}
      {onSearch && (
        <Input
          className="max-w-64 mb-0 mr-auto rounded-md"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
          }}
        />
      )}
      {isFiltered && (
        <Button
          color="minimal"
          EndIcon="x"
          onClick={() => table.resetColumnFilters()}
          className="h-8 px-2 lg:px-3">
          {t("clear")}
        </Button>
      )}

      {filterableItems &&
        filterableItems?.map((item) => {
          const foundColumn = table.getColumn(item.tableAccessor);
          if (foundColumn?.getCanFilter()) {
            return (
              <DataTableFilter
                column={foundColumn}
                title={item.title}
                options={item.options}
                key={item.title}
              />
            );
          }
        })}

      {tableCTA ? tableCTA : null}
    </div>
  );
}
