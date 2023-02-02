import React, { useContext } from "react";

import { FiSearch } from "../../../icon";
import { SelectContext } from "./SelectProvider";

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ placeholder = "", value = "", onChange, name = "" }) => {
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
            : "absolute mt-2.5 ml-2 h-5 w-5 pb-0.5 text-gray-500"
        }
      />
      <input
        className={
          classNames && classNames.searchBox
            ? classNames.searchBox
            : "w-full rounded border border-gray-200 bg-gray-100 py-2 pl-8 text-sm text-gray-500 focus:border-gray-200 focus:outline-none focus:ring-0"
        }
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
