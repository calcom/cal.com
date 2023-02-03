import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";

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

type FlatternedOption = Option & { current: number; groupedIndex?: number };

const flatternOptions = (options: Option[], groupCount?: number): FlatternedOption[] => {
  return options.reduce((acc, option, current) => {
    if (option.options) {
      return [...acc, ...flatternOptions(option.options, current + (groupCount || 0))];
    }
    return [...acc, { ...option, current, groupedIndex: groupCount }];
  }, [] as FlatternedOption[]);
};

function Options<T extends Option>({ list, inputValue, searchBoxRef }: OptionsProps<T>) {
  const { classNames, handleValueChange } = useContext(SelectContext);
  const [keyboardFocus, setKeyboardFocus] = useState(-1);
  const downPress = useKeyPress("ArrowDown", searchBoxRef);
  const upPress = useKeyPress("ArrowUp", searchBoxRef);
  const enterPress = useKeyPress("Enter", searchBoxRef);

  const flatternedList = useMemo(() => flatternOptions(list), [list]);

  const totalOptionsLength = useMemo(() => {
    return flatternedList.length;
  }, [flatternedList]);

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
      const item = flatternedList[keyboardFocus];
      if (!item || item.disabled) return;
      handleValueChange(item);
    }
    // We don't want to re-run this effect when handleValueChange changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterPress, keyboardFocus, list]);

  const search = useCallback((optionsArray: FlatternedOption[], searchTerm: string) => {
    // search options by label, or group label or options.options
    return optionsArray.reduce((acc: FlatternedOption[], option: FlatternedOption) => {
      if (option.label.toLowerCase().includes(searchTerm.toLowerCase())) {
        acc.push(option);
      }

      return acc;
    }, [] as FlatternedOption[]);
  }, []);

  const filteredList = useMemo(() => {
    if (inputValue.length > 0) {
      return search(flatternedList, inputValue);
    }

    return flatternedList;
  }, [inputValue, flatternedList, search]);

  return (
    <div
      role="options"
      className={
        classNames?.list ?? "flex max-h-72 flex-col space-y-[1px] overflow-y-auto overflow-y-scroll"
      }>
      {filteredList?.map((item, index) => {
        const focused = index === keyboardFocus;
        return (
          <React.Fragment key={index}>
            <div className="px-2.5">
              {item.current === 0 && item.groupedIndex !== undefined && (
                <Label>{list[item.groupedIndex].label}</Label>
              )}
              <Item item={item} index={index} focused={focused} />
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default Options;
