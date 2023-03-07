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
            : "dark:text-darkgray-500 absolute mt-2.5 ml-2 h-5 w-5 pb-0.5 text-gray-500"
        }
      />
      <input
        ref={searchInputRef}
        className={
          classNames && classNames.searchBox
            ? classNames.searchBox
            : "dark:border-darkgray-300 dark:bg-darkgray-100  dark:text-darkgray-900 focus:border-darkgray-900 w-full rounded-[6px] border border-gray-200 py-2 pl-8 text-sm text-gray-500 focus:border-gray-900 focus:outline-none focus:ring-0"
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
