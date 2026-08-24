import type { GroupBase, Props } from "react-select";

export type SelectProps<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
> = Props<Option, IsMulti, Group> & {
  variant?: "default" | "checkbox";
  "data-testid"?: string;
  size?: "sm" | "md";
  grow?: boolean;
};
