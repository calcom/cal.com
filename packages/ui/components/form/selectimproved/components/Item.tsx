import React from "react";
import { FiCheck } from "react-icons/fi";

import { classNames as cn } from "@calcom/lib";

import { useSelectContext } from "./SelectProvider";
import { Option } from "./type";

interface ItemProps {
  item: Option;
  index?: number;
  focused: boolean;
}

const Item: React.FC<ItemProps> = ({ item, index, focused }) => {
  const { classNames, selectedItems, handleValueChange } = useSelectContext();
  const isSelected =
    (Array.isArray(selectedItems) && selectedItems?.some((selection) => selection.value === item.value)) ||
    (!Array.isArray(selectedItems) && selectedItems?.value === item.value);

  return (
    <>
      {item.disabled ? (
        <li
          className={cn(
            "flex cursor-not-allowed select-none justify-between truncate px-2.5 py-2 text-gray-400",
            focused ? "bg-gray-50" : "hover:bg-gray-100"
          )}>
          <>
            <div className="flex space-x-2">
              {item.leftNode && item.leftNode}
              <p>{item.label}</p>
            </div>
            <div
              className={cn(
                "text-primary-600 h-4 w-4 rounded-[4px] border border-gray-300 bg-gray-50 ltr:mr-2 rtl:ml-2 "
              )}
            />
          </>
        </li>
      ) : (
        <li
          aria-selected={isSelected}
          tabIndex={index}
          role="option"
          onClick={() => handleValueChange(item)}
          className={cn(
            "block flex cursor-pointer select-none items-center justify-between truncate px-2.5 py-2 transition duration-200 ",
            isSelected ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100",
            focused && "border border-gray-300 bg-gray-100",
            classNames?.listItem
          )}>
          <div className="flex space-x-2">
            {item.leftNode && item.leftNode}
            <p>{item.label}</p>
          </div>

          <div
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-[4px]  border ltr:mr-2 rtl:ml-2",
              isSelected ? "bg-gray-800 text-gray-50" : "text-primary-600 border-gray-300 bg-gray-50"
            )}>
            {isSelected && <FiCheck className="h-3 w-3 text-current" />}
          </div>
        </li>
      )}
    </>
  );
};

export default Item;
