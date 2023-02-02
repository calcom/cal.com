import React, { useCallback, useMemo } from "react";

import { classNames as cn } from "@calcom/lib";

import { COLORS, DEFAULT_THEME, THEME_DATA } from "../constants";
import DisabledItem from "./DisabledItem";
import { useSelectContext } from "./SelectProvider";
import { Option } from "./type";

interface ItemProps {
  item: Option;
  primaryColor: string;
}

const Item: React.FC<ItemProps> = ({ item, primaryColor }) => {
  const { classNames, selectedItems, handleValueChange } = useSelectContext();
  const isSelected =
    Array.isArray(selectedItems) && selectedItems?.some((selection) => selection.value === item.value);

  return (
    <>
      {item.disabled ? (
        <DisabledItem>{item.label}</DisabledItem>
      ) : (
        <li
          aria-selected={isSelected}
          role="option"
          onClick={() => handleValueChange(item)}
          className={cn(
            "block cursor-pointer select-none truncate rounded px-2 py-2 transition duration-200 ",
            isSelected ? "bg-blue-500 text-white" : "text-gray-500 hover:bg-blue-300",
            classNames?.listItem
          )}>
          {item.label} {isSelected && <span className="text-white">✓</span>}
        </li>
      )}
    </>
  );
};

export default Item;
