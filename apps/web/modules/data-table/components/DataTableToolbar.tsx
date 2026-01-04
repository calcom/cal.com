"use client";

import type { Table } from "@tanstack/react-table";
import { forwardRef, useEffect } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { useState, type Ref, type ChangeEvent } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Button, type ButtonProps } from "@calcom/ui/components/button";
import { FilterSearchField } from "@calcom/ui/components/form";

import { useColumnFilters, useDataTable } from "../hooks";

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

interface SearchBarProps {
  className?: string;
}

function SearchBarComponent({ className }: SearchBarProps, ref: Ref<HTMLInputElement>) {
  const { searchTerm, setSearchTerm } = useDataTable();
  const { t } = useLocale();
  const [localValue, setLocalValue] = useState(searchTerm);

  useEffect(() => {
    setLocalValue(searchTerm);
  }, [searchTerm]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocalValue(value);
    setSearchTerm(value);
  };

  return (
    <FilterSearchField
      ref={ref}
      className={classNames("max-w-48", className)}
      placeholder={t("search")}
      value={localValue}
      onChange={handleSearchChange}
    />
  );
}

const SearchBar = forwardRef(SearchBarComponent) as (
  props: SearchBarProps & { ref?: React.Ref<HTMLInputElement> }
) => ReturnType<typeof SearchBarComponent>;

interface ClearFiltersButtonProps<TData> {
  table: Table<TData>;
}

function ClearFiltersButtonComponent<TData>(
  { table }: ClearFiltersButtonProps<TData>,
  ref: React.Ref<HTMLButtonElement>
) {
  const { t } = useLocale();
  const columnFilters = useColumnFilters();
  const isFiltered = columnFilters.length > 0;
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
