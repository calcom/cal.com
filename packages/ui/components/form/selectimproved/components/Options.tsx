import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useKeyPress } from "@calcom/lib/hooks/useKeyPress";

import GroupItem from "./GroupItem";
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

const flatternOptions = (options: Option[]): Option[] => {
  return options.reduce((acc, option) => {
    if (option.options) {
      return [...acc, ...flatternOptions(option.options)];
    }
    return [...acc, option];
  }, [] as Option[]);
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

  const search = useCallback((optionsArray: Option[], searchTerm: string) => {
    // search options by label, or group label or options.options
    return optionsArray.reduce((acc: Option[], option: Option) => {
      if (option.options) {
        const options = search(option.options, searchTerm);
        if (options.length > 0) {
          acc.push({
            ...option,
            options,
          });
        }
        // If search term matches group label, show group
        if (option.label.toLowerCase() == searchTerm.toLowerCase()) {
          acc.push(option);
        }
      } else if (option.label.toLowerCase().includes(searchTerm.toLowerCase())) {
        acc.push(option);
      }

      return acc;
    }, [] as Option[]);
  }, []);

  const filteredList = useMemo(() => {
    if (inputValue.length > 0) {
      return search(list, inputValue);
    }

    return list;
  }, [inputValue, list, search]);

  return (
    <div role="options" className={classNames?.list ?? "max-h-72 overflow-y-auto overflow-y-scroll"}>
      {filteredList?.map((item, index) => {
        const hocused = index === keyboardFocus;
        return (
          <React.Fragment key={index}>
            {item.options ? (
              <>
                <div className="px-2.5">
                  <GroupItem
                    index={index}
                    item={item as Option & { options: Option[] }}
                    keyboardFocusIndex={keyboardFocus}
                  />
                </div>
              </>
            ) : (
              <div className="px-2.5">
                <Item item={item} index={index} hocused={hocused} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default Options;
