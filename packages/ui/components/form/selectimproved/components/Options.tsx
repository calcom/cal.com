import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useKeyPress } from "@calcom/lib/hooks/useKeyPress";

import { Label } from "../../inputs/Label";
import Item from "./Item";
import { SelectContext } from "./SelectProvider";
import { Option } from "./type";

interface OptionsProps<T extends Option> {
  list: T[];
  inputValue: string;
  isMultiple: boolean;
  selected: T | T[] | null;
  searchBoxRef: React.RefObject<HTMLInputElement>;
}

type FlattenedOption = Option & { current: number; groupedIndex?: number };

const flatternOptions = (options: Option[], groupCount?: number): FlattenedOption[] => {
  return options.reduce((acc, option, current) => {
    if (option.options) {
      return [...acc, ...flatternOptions(option.options, current + (groupCount || 0))];
    }
    return [...acc, { ...option, current, groupedIndex: groupCount }];
  }, [] as FlattenedOption[]);
};

function FilteredItem<T extends Option>({
  index,
  keyboardFocus,
  item,
  inputValue,
  list,
}: {
  index: number;
  keyboardFocus: number;
  item: FlattenedOption;
  inputValue: string;
  list: T[];
}) {
  const focused = index === keyboardFocus;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && focused) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [ref, focused]);

  return (
    <div className="px-2.5" key={index} ref={ref}>
      {item.current === 0 && item.groupedIndex !== undefined && !inputValue && (
        <Label>{list[item.groupedIndex].label}</Label>
      )}
      <Item item={item} index={index} focused={focused} />
    </div>
  );
}

function Options<T extends Option>({ list, inputValue, searchBoxRef }: OptionsProps<T>) {
  const { classNames, handleValueChange } = useContext(SelectContext);
  const [keyboardFocus, setKeyboardFocus] = useState(-1);
  const downPress = useKeyPress("ArrowDown", searchBoxRef);
  const upPress = useKeyPress("ArrowUp", searchBoxRef);
  const enterPress = useKeyPress("Enter", searchBoxRef);

  const flattenedList = useMemo(() => flatternOptions(list), [list]);

  const totalOptionsLength = useMemo(() => {
    return flattenedList.length;
  }, [flattenedList]);

  useEffect(() => {
    if (downPress) {
      // Cycle to start of list if at end
      setKeyboardFocus((prev) => (prev + 1) % totalOptionsLength);
    }
  }, [downPress, totalOptionsLength]);

  useEffect(() => {
    if (upPress) {
      // Cycle to end of list if at start
      setKeyboardFocus((prev) => (prev - 1 + totalOptionsLength) % totalOptionsLength);
    }
  }, [upPress, totalOptionsLength]);

  useEffect(() => {
    if (enterPress) {
      const item = filteredList[keyboardFocus];
      if (!item || item.disabled) return;
      handleValueChange(item);
    }
    // We don't want to re-run this effect when handleValueChange changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterPress, keyboardFocus, list]);

  const search = useCallback((optionsArray: FlattenedOption[], searchTerm: string) => {
    // search options by label, or group label or options.options
    return optionsArray.reduce((acc: FlattenedOption[], option: FlattenedOption) => {
      // @TODO: add search by lavbel group gets awkward as it doesnt exist in the flattened list
      if (option.label.toLowerCase().includes(searchTerm.toLowerCase())) {
        acc.push(option);
      }

      return acc;
    }, [] as FlattenedOption[]);
  }, []);

  const filteredList = useMemo(() => {
    if (inputValue.length > 0) {
      return search(flattenedList, inputValue);
    }

    return flattenedList;
  }, [inputValue, flattenedList, search]);

  return (
    <div
      className={
        classNames?.list ?? "flex max-h-72 flex-col space-y-[1px] overflow-y-auto overflow-y-scroll"
      }>
      {filteredList?.map((item, index) => (
        <FilteredItem
          key={index}
          item={item}
          index={index}
          keyboardFocus={keyboardFocus}
          inputValue={inputValue}
          list={list}
        />
      ))}
    </div>
  );
}

export default Options;
