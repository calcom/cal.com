import type { GroupBase, SelectComponentsConfig, MenuPlacement } from "react-select";

import { InputComponent, OptionComponent } from "./components";

export const getReactSelectProps = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  components,
  menuPlacement = "auto",
}: {
  components: SelectComponentsConfig<Option, IsMulti, Group>;
  menuPlacement?: MenuPlacement;
}) => {
  return {
    menuPlacement,
    components: {
      Input: InputComponent,
      Option: OptionComponent,
      ...components,
    },
    unstyled: true,
  };
};
