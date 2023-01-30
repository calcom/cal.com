import { useCombobox, useMultipleSelection } from "downshift";
import React from "react";
import { FiCheck } from "react-icons/fi";

import { classNames } from "@calcom/lib";

import { Divider } from "../../divider";
import { TextField } from "../inputs/Input";
import { Label } from "../inputs/Label";

type StringProperties<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

interface MultiComboboxProps<T extends Record<string, unknown>> {
  items: T[];
  /** The field that will be used to display info */
  labelKey: keyof T;
  // gets that can be used to search for items in text box
  searchableKey?: StringProperties<T>;
  dividerKey?: keyof T;
  initalSelectedItems?: T[];
  /** @default true */
  renderItemsInside?: boolean;
  onSelectedItemsChange?: (selectedItems: T[]) => void;
}

export function MultipleComboBoxExample<T extends Record<string, unknown>>(props: MultiComboboxProps<T>) {
  const { renderItemsInside = true } = props;
  const [inputValue, setInputValue] = React.useState("");
  const [selectedItems, setSelectedItems] = React.useState<T[]>(props.initalSelectedItems || ([] as T[]));

  const items = React.useMemo(() => {
    const lowerCasedInputValue = inputValue.toLowerCase();
    return props.items.filter(function filterItem(item) {
      const itemSearchable = props.searchableKey && (item[props.searchableKey] as string); // we know this is as string due to string properties type
      return itemSearchable ? itemSearchable?.toLowerCase().includes(lowerCasedInputValue) : props.items;
    });
  }, [inputValue, props.items, props.searchableKey]);

  const { getSelectedItemProps, getDropdownProps, removeSelectedItem } = useMultipleSelection({
    selectedItems,
    onStateChange({ selectedItems: newSelectedItems, type }) {
      switch (type) {
        case useMultipleSelection.stateChangeTypes.SelectedItemKeyDownBackspace:
        case useMultipleSelection.stateChangeTypes.SelectedItemKeyDownDelete:
        case useMultipleSelection.stateChangeTypes.DropdownKeyDownBackspace:
        case useMultipleSelection.stateChangeTypes.FunctionRemoveSelectedItem:
          if (newSelectedItems) {
            setSelectedItems(newSelectedItems);
            props.onSelectedItemsChange && props.onSelectedItemsChange(newSelectedItems);
          }
          break;
        default:
          break;
      }
    },
  });
  const {
    isOpen,
    getToggleButtonProps,
    getLabelProps,
    getMenuProps,
    getInputProps,
    getItemProps,
    highlightedIndex,
  } = useCombobox({
    items,
    stateReducer(state, actionAndChanges) {
      const { changes, type } = actionAndChanges;

      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
        case useCombobox.stateChangeTypes.InputBlur:
          return {
            ...changes,
            ...(changes.selectedItem && { isOpen: true, highlightedIndex: changes.highlightedIndex }),
          };
        default:
          return changes;
      }
    },
    onStateChange({ type, selectedItem: newSelectedItem, inputValue: newInputValue }) {
      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
          if (newSelectedItem) {
            if (selectedItems.includes(newSelectedItem)) {
              removeSelectedItem(newSelectedItem);
              props.onSelectedItemsChange && props.onSelectedItemsChange(selectedItems);
              return;
            }
            const newSelectedItems = [...selectedItems, newSelectedItem];
            setSelectedItems(newSelectedItems);
            props.onSelectedItemsChange && props.onSelectedItemsChange(newSelectedItems);
          }
          break;

        case useCombobox.stateChangeTypes.InputChange:
          setInputValue(newInputValue || "");

        default:
          break;
      }
    },
  });

  return (
    <>
      <div className="flex flex-col">
        <Label {...getLabelProps()}>Pick some books:</Label>
        <div
          aria-label="menu-toggle"
          {...getToggleButtonProps(getDropdownProps({ preventKeyAction: isOpen }))}
          className="flex h-9 space-x-1 rounded-md border border-gray-300 p-1 focus-within:border-gray-900 hover:cursor-pointer hover:border-gray-400 focus-visible:border-gray-900">
          {renderItemsInside &&
            selectedItems.map(function renderSelectedItem(selectedItemForRender, index) {
              return (
                <div
                  className="hocus:text-gray-900 hocus:bg-gray-300 focus:border-1 flex items-center rounded-md border-transparent bg-gray-200 px-2 py-[6px] text-sm text-gray-700"
                  key={`selected-item-${index}`}
                  {...getSelectedItemProps({
                    selectedItem: selectedItemForRender,
                    index,
                  })}>
                  <span>
                    <>{selectedItemForRender[props.labelKey]}</>
                  </span>
                  <span
                    className="ml-2 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSelectedItem(selectedItemForRender);
                    }}>
                    &#10005;
                  </span>
                </div>
              );
            })}
        </div>
      </div>
      <ul
        {...getMenuProps()}
        className="absolute mt-2 max-h-80 max-w-[256px] overflow-scroll rounded-md border border-gray-300 bg-white p-0 focus-visible:border-gray-900 ">
        {isOpen && (
          <div className="">
            {props.searchableKey && (
              <div className="flex px-3 pt-2.5">
                <TextField
                  label="Search"
                  labelSrOnly
                  placeholder="Best book ever"
                  {...getInputProps(getDropdownProps({ preventKeyAction: true }))}
                />
              </div>
            )}
            {items.map((item, index) => {
              const isSelected = selectedItems.includes(item);

              if (item["type"] === "divider") {
                return <Divider className="px-3" />;
              }
              if (item["type"] === "label") {
                return (
                  <div className="px-3">
                    <span className="text-xs uppercase leading-none text-gray-600">
                      <>{item["text"]}</>
                    </span>
                  </div>
                );
              }

              return (
                <li
                  className={classNames(
                    "space-between flex cursor-pointer items-center border-transparent text-sm hover:bg-gray-200",
                    isSelected && "bg-gray-100",
                    highlightedIndex === index &&
                      "bg-gray-200 focus-visible:border focus-visible:border-gray-900"
                  )}
                  key={`${item[props.labelKey]}${index}`}
                  {...getItemProps({ item, index })}>
                  <div className="flex w-full justify-between px-3 py-2.5">
                    <span>
                      <>{item[props.labelKey]}</>
                    </span>
                    {isSelected && <FiCheck className="h-4 w-4 text-black" />}
                  </div>
                </li>
              );
            })}
          </div>
        )}
      </ul>
    </>
  );
}
