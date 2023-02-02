import React, { useCallback, useContext, useMemo } from "react";

import { DEFAULT_THEME } from "../constants";
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
  primaryColor: string;
  selected: T | T[] | null;
}

function Options<T extends Option>({
  list,
  noOptionsMessage,
  inputValue,
  primaryColor = DEFAULT_THEME,
}: OptionsProps<T>) {
  const { classNames } = useContext(SelectContext);

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
        return (
          <React.Fragment key={index}>
            {item.options ? (
              <>
                <div className="px-2.5">
                  <GroupItem primaryColor={primaryColor || DEFAULT_THEME} item={item} />
                </div>

                {index + 1 < list.length && <hr className="my-1" />}
              </>
            ) : (
              <div className="px-2.5">
                <Item primaryColor={primaryColor || DEFAULT_THEME} item={item} />
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
