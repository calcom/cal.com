import React from "react";
import ReactSelect, { components, GroupBase, Props } from "react-select";

import classNames from "@lib/classNames";

function Select<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({ className, ...props }: Props<Option, IsMulti, Group>) {
  return (
    <ReactSelect
      theme={(theme) => ({
        ...theme,
        borderRadius: 2,
        colors: {
          ...theme.colors,
          primary: "rgba(17, 17, 17, var(--tw-bg-opacity))",

          primary50: "rgba(209 , 213, 219, var(--tw-bg-opacity))",
          primary25: "rgba(244, 245, 246, var(--tw-bg-opacity))",
        },
      })}
      styles={{
        option: (base, state) => ({
          ...base,
          ":active": {
            backgroundColor: state.isSelected ? "" : "rgba(17, 17, 17, var(--tw-bg-opacity))",
            color: "#ffffff",
          },
        }),
      }}
      components={{
        ...components,
        IndicatorSeparator: () => null,
      }}
      className={classNames("focus:border-primary-500 text-sm shadow-sm", className)}
      {...props}
    />
  );
}

export default Select;
