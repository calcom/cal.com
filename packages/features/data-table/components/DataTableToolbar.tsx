"use client";

import type { Table } from "@tanstack/react-table";
import { useEffect, useState, forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

import { classNames } from "@calcom/lib";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ButtonProps } from "@calcom/ui";
import { Button, Input } from "@calcom/ui";

interface DataTableToolbarProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode;
}

const Root = forwardRef<HTMLDivElement, DataTableToolbarProps>(function DataTableToolbar(
  { children, className },
  ref
) {
  return (
    <div
      ref={ref}
      className={classNames("grid w-full items-center gap-2 py-4", className)}
      style={{ gridArea: "header" }}>
      {children}
    </div>
  );
});

interface SearchBarProps<TData> {
  table: Table<TData>;
  searchKey?: string;
  onSearch?: (value: string) => void;
  className?: string;
}

function SearchBarComponent<TData>(
  { table, searchKey, onSearch, className }: SearchBarProps<TData>,
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
        className={`max-w-64 mb-0 mr-auto rounded-md ${className ?? ""}`}
        placeholder="Search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value.trim())}
      />
    );
  }

  if (!searchKey) {
    console.error("searchKey is required if onSearch is not provided");
    return null;
  }

  return (
    <Input
      ref={ref}
      className="max-w-64 mb-0 mr-auto rounded-md"
      placeholder="Search"
      value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
      onChange={(event) => {
        return table.getColumn(searchKey)?.setFilterValue(event.target.value.trim());
      }}
    />
  );
}

const SearchBar = forwardRef(SearchBarComponent) as <TData>(
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

const ClearFiltersButton = forwardRef(ClearFiltersButtonComponent) as <TData>(
  props: ClearFiltersButtonProps<TData> & { ref?: React.Ref<HTMLButtonElement> }
) => ReturnType<typeof ClearFiltersButtonComponent>;

function CTAComponent(
  { children, onClick, color = "primary", ...rest }: ButtonProps,
  ref: React.Ref<HTMLButtonElement>
) {
  return (
    <Button ref={ref} color={color} onClick={onClick} {...rest}>
      {children}
    </Button>
  );
}

const CTA = forwardRef(CTAComponent) as (
  props: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }
) => ReturnType<typeof CTAComponent>;

export const DataTableToolbar = { Root, SearchBar, ClearFiltersButton, CTA };
