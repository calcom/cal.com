import React from "react";
import { FiCheck } from "react-icons/fi";

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
          "dark:text-darkgray-400 flex cursor-not-allowed select-none justify-between truncate rounded-[4px] px-3 py-2 text-gray-300 ",
          focused ? "dark:bg-darkgray-200 bg-gray-50" : "dark:hover:bg-darkgray-200 hover:bg-gray-100"
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
                  ? "dark:bg-darkgray-200 dark:text-darkgray-900 dark:border-darkgray-300 bg-gray-800 text-gray-50"
                  : "dark:text-darkgray-600 dark:bg-darkgray-200 dark:border-darkgray-300 border-gray-300 bg-gray-50 text-gray-600"
              )}>
              {isSelected && <FiCheck className="h-3 w-3 text-current" />}
            </div>
          ) : (
            isSelected && <FiCheck className="h-3 w-3 text-black" strokeWidth={2} />
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
          ? "dark:bg-darkgray-200 dark:text-darkgray-900 bg-gray-100 text-gray-900"
          : "dark:text-darkgray-700 dark:hover:bg-darkgray-200 text-gray-700 hover:bg-gray-100",
        focused && "dark:bg-darkgray-200 bg-gray-50",
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
              ? "dark:bg-darkgray-200 dark:text-darkgray-900 dark:border-darkgray-300 bg-gray-800 text-gray-50"
              : "dark:text-darkgray-600 dark:bg-darkgray-200 dark:border-darkgray-300 border-gray-300 bg-gray-50 text-gray-600"
          )}>
          {isSelected && <FiCheck className="h-3 w-3 text-current" />}
        </div>
      ) : (
        isSelected && <FiCheck className="h-3 w-3 text-black" strokeWidth={2} />
      )}
    </li>
  );
};

export default Item;
