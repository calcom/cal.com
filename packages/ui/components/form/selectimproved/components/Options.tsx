import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useKeyPress } from "@calcom/lib/hooks/useKeyPress";

import DisabledItem from "./DisabledItem";
import GroupItem from "./GroupItem";
import Item from "./Item";
import { SelectContext } from "./SelectProvider";
import { Option } from "./type";

interface OptionsProps<T extends Option> {
  list: T[];
  noOptionsMessage: string;
  inputValue: string;
  isMultiple: boolean;
  selected: T | T[] | null;
  searchBoxRef: React.RefObject<HTMLInputElement>;
}

function Options<T extends Option>({ list, noOptionsMessage, inputValue, searchBoxRef }: OptionsProps<T>) {
  const { classNames, handleValueChange } = useContext(SelectContext);
  const [hovered, setHovered] = useState(-1);
  const [keyboardFocus, setKeyboardFocus] = useState(-1);
  const downPress = useKeyPress("ArrowDown", searchBoxRef);
  const upPress = useKeyPress("ArrowUp", searchBoxRef);
  const enterPress = useKeyPress("Enter", searchBoxRef);

  useEffect(() => {
    if (downPress) {
      // Cycle to start of list if at end
      setKeyboardFocus((prev) => (prev + 1) % list.length);
    }
  }, [downPress, list]);

  useEffect(() => {
    if (upPress) {
      // Cycle to end of list if at start
      setKeyboardFocus((prev) => (prev - 1 + list.length) % list.length);
    }
  }, [upPress, list]);

  useEffect(() => {
    if (enterPress) {
      const item = list[keyboardFocus];
      handleValueChange(item);
    }
  }, [enterPress, keyboardFocus, list, handleValueChange]);

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
        const hocused = index === hovered || index === keyboardFocus;
        return (
          <React.Fragment key={index}>
            {item.options ? (
              <>
                <div className="px-2.5">
                  <GroupItem item={item as Option & { options: Option[] }} hocused={hocused} />
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

      {list.length === 0 && <DisabledItem>{noOptionsMessage}</DisabledItem>}
    </div>
  );
}

export default Options;
