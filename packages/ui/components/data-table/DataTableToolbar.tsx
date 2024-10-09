"use client";

import type { Table } from "@tanstack/react-table";
import { useEffect, useState, forwardRef } from "react";

import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button } from "../button";
import { Input } from "../form";
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
interface DataTableToolbarProps {
  children: React.ReactNode;
}

export const Root = forwardRef<HTMLDivElement, DataTableToolbarProps>(function DataTableToolbar(
  { children },
  ref
) {
  return (
    <div ref={ref} className="flex items-center justify-end gap-2 py-4" style={{ gridArea: "header" }}>
      {children}
    </div>
  );
});

interface SearchBarProps<TData> {
  table: Table<TData>;
  searchKey: string;
  onSearch?: (value: string) => void;
}

function SearchBarComponent<TData>(
  { table, searchKey, onSearch }: SearchBarProps<TData>,
  ref: React.Ref<HTMLInputElement>
) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    onSearch?.(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

  if (onSearch) {
    return (
      <Input
        ref={ref}
        className="max-w-64 mb-0 mr-auto rounded-md"
        placeholder="Search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value.trim())}
      />
    );
  }

  return (
    <Input
      ref={ref}
      className="max-w-64 mb-0 mr-auto rounded-md"
      placeholder="Search"
      value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
      onChange={(event) => table.getColumn(searchKey)?.setFilterValue(event.target.value.trim())}
    />
  );
}

export const SearchBar = forwardRef(SearchBarComponent) as <TData>(
  props: SearchBarProps<TData> & { ref?: React.Ref<HTMLInputElement> }
) => ReturnType<typeof SearchBarComponent>;

interface ClearFiltersButtonProps<TData> {
  table: Table<TData>;
}

function ClearFiltersButtonComponent<TData>(
  { table }: ClearFiltersButtonProps<TData>,
  ref: React.Ref<HTMLButtonElement>
) {
  const { t } = useLocale();
  const isFiltered = table.getState().columnFilters.length > 0;
  if (!isFiltered) return null;
  return (
    <Button
      ref={ref}
      color="minimal"
      EndIcon="x"
      onClick={() => table.resetColumnFilters()}
      className="h-8 px-2 lg:px-3">
      {t("clear")}
    </Button>
  );
}

export const ClearFiltersButton = forwardRef(ClearFiltersButtonComponent) as <TData>(
  props: ClearFiltersButtonProps<TData> & { ref?: React.Ref<HTMLButtonElement> }
) => ReturnType<typeof ClearFiltersButtonComponent>;
