"use client";

import { type Table } from "@tanstack/react-table";

import { forwardRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { type ButtonProps, Button, buttonClasses } from "@calcom/ui/components/button";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@calcom/ui/components/command";
import { Icon } from "@calcom/ui/components/icon";
import { Popover, PopoverTrigger, PopoverContent } from "@calcom/ui/components/popover";

export interface ColumnVisiblityProps<TData> {
  table: Table<TData>;
}

function ColumnVisibilityButtonComponent<TData>(
  {
    children,
    color = "secondary",
    StartIcon = "sliders-vertical",
    table,
    ...rest
  }: ColumnVisiblityProps<TData> & ButtonProps,
  ref: React.Ref<HTMLButtonElement>
) {
  const { t } = useLocale();
  const allColumns = table.getAllLeafColumns();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button ref={ref} color={color} StartIcon={StartIcon} {...rest}>
          {children ? children : t("display")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("search")} />
          <CommandList>
            <CommandEmpty>{t("no_columns_found")}</CommandEmpty>
            <CommandGroup heading={t("toggle_columns")}>
              {allColumns.map((column) => {
                const canHide = column.getCanHide();
                if (!column.columnDef.header || typeof column.columnDef.header !== "string" || !canHide)
                  return null;
                const isVisible = column.getIsVisible();
                return (
                  <CommandItem
                    key={column.id}
                    onSelect={() => {
                      column.toggleVisibility(!isVisible);
                    }}>
                    <div
                      className={classNames(
                        "border-subtle mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                        isVisible ? "text-emphasis" : "opacity-50 [&_svg]:invisible"
                      )}>
                      <Icon name="check" className={classNames("h-4 w-4", !isVisible && "invisible")} />
                    </div>
                    {column.columnDef.header}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          <CommandSeparator className="mb-0" />
          <CommandGroup>
            <CommandItem
              onSelect={() => {
                table.toggleAllColumnsVisible(true);
              }}
              className={classNames(
                buttonClasses({ color: "secondary" }),
                "mt-0 w-full cursor-pointer justify-center text-center"
              )}>
              {t("show_all_columns")}
            </CommandItem>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export const ColumnVisibilityButton = forwardRef(ColumnVisibilityButtonComponent) as <TData>(
  props: ColumnVisiblityProps<TData> & ButtonProps & { ref?: React.Ref<HTMLButtonElement> }
) => ReturnType<typeof ColumnVisibilityButtonComponent>;
