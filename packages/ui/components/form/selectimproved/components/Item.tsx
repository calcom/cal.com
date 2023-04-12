import { Check } from "lucide-react";
import React from "react";

import { classNames as cn } from "@calcom/lib";

import { useSelectContext } from "./SelectProvider";
import type { Option } from "./type";

interface ItemProps {
  item: Option;
  index?: number;
  focused: boolean;
}

const Item: React.FC<ItemProps> = ({ item, index, focused }) => {
  const { classNames, selectedItems, handleValueChange } = useSelectContext();
  const isMultiple = Array.isArray(selectedItems);
  const isSelected =
    (isMultiple && selectedItems?.some((selection) => selection.value === item.value)) ||
    (!isMultiple && selectedItems?.value === item.value);

  if (item.disabled) {
    return (
      <li
        className={cn(
          " flex cursor-not-allowed select-none justify-between truncate rounded-[4px] px-3 py-2 text-gray-300 ",
          focused ? "dark:bg-darkgray-200 bg-muted" : "dark:hover:bg-darkgray-200 hover:bg-subtle"
        )}>
        <>
          <div className="space-x flex items-center">
            {item.leftNode && item.leftNode}
            <p>{item.label}</p>
          </div>
          {isMultiple ? (
            <div
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-[4px]  border opacity-70 ltr:mr-2 rtl:ml-2",
                isSelected
                  ? "dark:bg-darkgray-200  border-subtle bg-gray-800 text-gray-50"
                  : " dark:bg-darkgray-200 border-subtle border-default bg-mutedext-gray-600"
              )}>
              {isSelected && <Check className="h-3 w-3 text-current" />}
            </div>
          ) : (
            isSelected && <Check className="text-emphasis h-3 w-3" strokeWidth={2} />
          )}
        </>
      </li>
    );
  }

  return (
    <li
      aria-selected={isSelected}
      tabIndex={index}
      role="option"
      onClick={() => handleValueChange(item)}
      className={cn(
        "block flex cursor-pointer select-none items-center justify-between truncate border-transparent px-3 py-2 transition duration-200",
        isSelected
          ? "dark:bg-darkgray-200  bg-subtle text-emphasis"
          : " dark:hover:bg-darkgray-200 text-default hover:bg-subtle",
        focused && "dark:bg-darkgray-200 bg-muted",
        classNames?.listItem
      )}>
      <div className="flex items-center space-x-2">
        {item.leftNode && item.leftNode}
        <p>{item.label}</p>
      </div>

      {isMultiple ? (
        <div
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-[4px]  border ltr:mr-2 rtl:ml-2",
            isSelected
              ? "dark:bg-darkgray-200  border-subtle bg-gray-800 text-gray-50"
              : " dark:bg-darkgray-200 border-subtle border-default bg-mutedext-gray-600"
          )}>
          {isSelected && <Check className="h-3 w-3 text-current" />}
        </div>
      ) : (
        isSelected && <Check className="text-emphasis h-3 w-3" strokeWidth={2} />
      )}
    </li>
  );
};

export default Item;
