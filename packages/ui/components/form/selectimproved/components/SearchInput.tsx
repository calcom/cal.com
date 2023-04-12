import React, { useContext } from "react";

import { FiSearch } from "../../../icon";
import { SelectContext } from "./SelectProvider";

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = "",
  value = "",
  onChange,
  name = "",
  searchInputRef,
}) => {
  const { classNames } = useContext(SelectContext);
  return (
    <div
      className={
        classNames && classNames.searchContainer ? classNames.searchContainer : "relative py-1 px-2.5"
      }>
      <FiSearch
        className={
          classNames && classNames.searchIcon
            ? classNames.searchIcon
            : " text-subtle absolute mt-2.5 ml-2 h-5 w-5 pb-0.5"
        }
      />
      <input
        ref={searchInputRef}
        className={
          classNames && classNames.searchBox
            ? classNames.searchBox
            : "border-subtle dark:bg-darkgray-100   focus:border-darkgray-900 text-subtle border-subtle w-full rounded-[6px] border py-2 pl-8 text-sm focus:border-gray-900 focus:outline-none focus:ring-0"
        }
        autoFocus
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        name={name}
      />
    </div>
  );
};

export default SearchInput;
