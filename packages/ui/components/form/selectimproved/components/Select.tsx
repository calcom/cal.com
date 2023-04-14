import * as Popover from "@radix-ui/react-popover";
import React, { useCallback, useRef, useState } from "react";

import { classNames as cn } from "@calcom/lib";

import { X, ChevronDown } from "../../../icon";
import Options from "./Options";
import SearchInput from "./SearchInput";
import SelectProvider from "./SelectProvider";
import type { Option } from "./type";

interface SelectProps<T extends Option> {
  options: T[];
  selectedItems: T | T[] | null;
  onChange: (value?: Option | Option[] | null) => void;
  placeholder?: string;
  isMultiple?: boolean;
  isClearable?: boolean;
  isSearchable?: boolean;
  isDisabled?: boolean;
  loading?: boolean;
  menuIsOpen?: boolean;
  searchInputPlaceholder?: string;
  noOptionsMessage?: string;
  classNames?: {
    menuButton?: ({ isDisabled }: { isDisabled: boolean }) => string;
    menu?: string;
    tagItem?: ({ isDisabled }: { isDisabled: boolean }) => string;
    tagItemText?: string;
    tagItemIconContainer?: string;
    tagItemIcon?: string;
    list?: string;
    listGroupLabel?: string;
    listItem?: ({ isSelected }: { isSelected: boolean }) => string;
    listDisabledItem?: string;
    ChevronIcon?: ({ open }: { open: boolean }) => string;
    searchContainer?: string;
    searchBox?: string;
    searchIcon?: string;
    closeIcon?: string;
  };
}

function Select<T extends Option>({
  options = [],
  selectedItems = null,
  onChange,
  placeholder = "Select...",
  searchInputPlaceholder = "Search...",
  isMultiple = false,
  isClearable = false,
  isSearchable = false,
  isDisabled = false,
  menuIsOpen = false,
  classNames,
}: SelectProps<T>) {
  const [inputValue, setInputValue] = useState<string>("");
  const [open, setOpen] = useState(menuIsOpen);
  const searchBoxRef = useRef<HTMLInputElement>(null);

  const isMultipleValue = Array.isArray(selectedItems) && isMultiple;

  const removeItem = useCallback(
    (item: Option) => {
      // remove the item from the selected items
      if (Array.isArray(selectedItems)) {
        const newSelectedItems = selectedItems.filter((selectedItem) => selectedItem.value !== item.value);
        onChange(newSelectedItems);
      } else {
        onChange(null);
      }
    },
    [onChange, selectedItems]
  );

  const closeDropDown = useCallback(() => {
    console.log({ open });
    if (open) setOpen(false);
  }, [open]);

  const handleValueChange = useCallback(
    (selected: Option) => {
      function update() {
        if (!isMultiple && !Array.isArray(selectedItems)) {
          // Close dropdown when you select an item when we are on single select
          closeDropDown();
          onChange(selected);
          return;
        }

        // check if the selected item is already selected
        if (Array.isArray(selectedItems)) {
          const isAlreadySelected = selectedItems.some((item) => item.value === selected.value);
          if (isAlreadySelected) {
            removeItem(selected);
            return;
          }
          onChange(selectedItems === null ? [selected] : [...selectedItems, selected]);
        }
      }

      if (selected.disabled) return;

      if (selected !== selectedItems) {
        update();
      }
    },
    [closeDropDown, isMultiple, onChange, selectedItems, removeItem]
  );

  const clearValue = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      onChange(isMultiple ? [] : null);
    },
    [onChange, isMultiple]
  );

  return (
    <SelectProvider
      options={{
        classNames,
      }}
      selectedItems={selectedItems}
      handleValueChange={handleValueChange}>
      <div className="relative w-full">
        <Popover.Root>
          <Popover.Trigger>
            <div
              className={cn(
                "min-w-64 border-default text-muted flex max-h-[36px] items-center justify-between rounded-md border text-sm transition-all duration-300 focus:outline-none",
                isDisabled
                  ? " dark:bg-darkgray-200 border-subtle bg-subtle dark:text-subtle text-muted border-subtle"
                  : "border-subtle dark:bg-darkgray-50  dark:focus:border-darkgray-700 dark:focus:bg-darkgray-100 dark:focus:text-darkgray-900 dark:hover:text-darkgray-900 bg-default hover:border-empthasis focus:border-gray-900"
              )}>
              <div className="flex w-full grow-0 items-center gap-1 overflow-x-hidden">
                <>
                  {((isMultipleValue && selectedItems.length === 0) || selectedItems === null) && (
                    <div className="text-muted py-2.5 px-3 dark:text-current">
                      <p>{placeholder}</p>
                    </div>
                  )}

                  {Array.isArray(selectedItems) ? (
                    <div className="flex gap-1 overflow-x-scroll p-1 ">
                      {selectedItems.map((item, index) => (
                        <div
                          className={cn(
                            "dark:bg-darkgray-200 bg-emphasis flex items-center space-x-2 rounded px-2 py-[6px]"
                          )}
                          key={index}>
                          <p
                            className={cn(
                              classNames?.tagItemText ??
                                " text-default cursor-default select-none truncate text-sm leading-none"
                            )}>
                            {item.label}
                          </p>
                          {!isDisabled && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeItem(item);
                              }}>
                              <X
                                className={
                                  classNames?.tagItemIcon ??
                                  " dark:hover:text-darkgray-900 hover:text-emphasis text-subtle h-4 w-4"
                                }
                              />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className=" text-emphasis py-2.5 px-3 text-sm leading-none">
                      <p>{selectedItems?.label}</p>
                    </div>
                  )}
                </>
              </div>

              <div className=" text-emphasis flex flex-none items-center rounded-[6px] p-1.5 opacity-75 ">
                <>
                  {isClearable && !isDisabled && selectedItems !== null && (
                    <div className="cursor-pointer" onClick={clearValue}>
                      <X
                        className={
                          classNames && classNames.closeIcon ? classNames.closeIcon : "h-5 w-5 p-0.5"
                        }
                      />
                    </div>
                  )}

                  <ChevronDown className={cn("h-5 w-5 transition duration-300")} />
                </>
              </div>
            </div>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content>
              <div
                className={
                  classNames?.menu ??
                  "dark:bg-darkgray-100 border-subtle min-w-64 bg-default text-default z-10 mt-1.5 overflow-x-hidden rounded border py-1 text-sm shadow-sm"
                }>
                {isSearchable && (
                  <SearchInput
                    searchInputRef={searchBoxRef}
                    value={inputValue}
                    placeholder={searchInputPlaceholder}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                )}

                <Options
                  searchBoxRef={searchBoxRef}
                  list={options}
                  inputValue={inputValue}
                  isMultiple={isMultiple}
                  selected={selectedItems}
                />
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </SelectProvider>
  );
}

export default Select;
