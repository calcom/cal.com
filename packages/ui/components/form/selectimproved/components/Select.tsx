import React, { useCallback, useEffect, useRef, useState } from "react";

import { classNames as cn } from "@calcom/lib";
import { useKeyPress } from "@calcom/lib/hooks/useKeyPress";
import useOnClickOutside from "@calcom/lib/hooks/useOnclickOutside";

import { FiX, FiChevronDown } from "../../../icon";
import Options from "./Options";
import SearchInput from "./SearchInput";
import SelectProvider from "./SelectProvider";
import { Option } from "./type";

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
  const [open, setOpen] = useState<boolean>(menuIsOpen);
  const [inputValue, setInputValue] = useState<string>("");
  const ref = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLInputElement>(null);

  const isMultipleValue = Array.isArray(selectedItems) && isMultiple;

  const toggle = useCallback(() => {
    if (!isDisabled) {
      setOpen(!open);
    }
  }, [isDisabled, open]);

  const closeDropDown = useCallback(() => {
    if (open) setOpen(false);
  }, [open]);

  useOnClickOutside(ref, () => {
    closeDropDown();
  });

  useKeyPress("Escape", undefined, () => {
    closeDropDown();
  });

  const onPressEnterOrSpace = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      if ((e.code === "Enter" || e.code === "Space") && !isDisabled) {
        toggle();
      }
    },
    [isDisabled, toggle]
  );

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
      <div className="relative w-full" ref={ref}>
        <div
          tabIndex={0}
          aria-expanded={open}
          onKeyDown={onPressEnterOrSpace}
          onClick={toggle}
          className={cn(
            "flex max-h-[36px] items-center rounded-md border border-gray-300 text-sm text-gray-400 transition-all duration-300 focus:outline-none",
            isDisabled
              ? "border-gray-200 bg-gray-100 text-gray-400 "
              : "bg-white hover:border-gray-600 focus:border-gray-900"
          )}>
          <div className="flex grow flex-wrap items-center gap-1">
            <>
              {((isMultipleValue && selectedItems.length === 0) || selectedItems === null) && (
                <div className="py-2.5 px-3 text-gray-400">
                  <p>{placeholder}</p>
                </div>
              )}

              {Array.isArray(selectedItems) ? (
                <div className="flex gap-1 p-1">
                  {selectedItems.map((item, index) => (
                    <div
                      className={cn("flex items-center space-x-2 rounded-md bg-gray-200 px-2 py-[6px]")}
                      key={index}>
                      <p
                        className={cn(
                          classNames?.tagItemText ??
                            "cursor-default select-none truncate text-sm leading-none text-gray-700"
                        )}>
                        {item.label}
                      </p>
                      {!isDisabled && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(item);
                          }}>
                          <FiX
                            className={classNames?.tagItemIcon ?? "h-4 w-4 text-gray-500 hover:text-gray-900"}
                          />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-2.5 px-3 text-sm leading-none text-gray-900">
                  <p>{selectedItems?.label}</p>
                </div>
              )}
            </>
          </div>

          <div className="flex flex-none items-center py-1.5">
            {isClearable && !isDisabled && selectedItems !== null && (
              <div className="cursor-pointer px-1.5" onClick={clearValue}>
                <FiX
                  className={classNames && classNames.closeIcon ? classNames.closeIcon : "h-5 w-5 p-0.5"}
                />
              </div>
            )}

            <div className="h-full">
              <span className="inline-block h-full w-px bg-gray-300 text-white text-opacity-0" />
            </div>

            <div className="px-1.5">
              <FiChevronDown
                className={cn(
                  "h-6 w-6 p-0.5 transition duration-300",
                  open ? " rotate-180 transform text-gray-500" : " text-gray-300"
                )}
              />
            </div>
          </div>
        </div>

        {open && !isDisabled && (
          <div
            tabIndex={-1}
            className={
              classNames?.menu ??
              "absolute z-10 mt-1.5 w-full rounded border bg-white py-1 text-sm text-gray-700 shadow-lg"
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
        )}
      </div>
    </SelectProvider>
  );
}

export default Select;
