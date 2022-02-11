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
          primary50: "rgba(17, 17, 17, var(--tw-bg-opacity))",
          primary25: "rgba(244, 245, 246, var(--tw-bg-opacity))",
        },
      })}
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
