/// <reference types="react" />
import type { GroupBase, SelectComponentsConfig, MenuPlacement } from "react-select";
export declare const getReactSelectProps: <Option, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>({ components, menuPlacement, }: {
    components: Partial<import("react-select/dist/declarations/src/components").SelectComponents<Option, IsMulti, Group>>;
    menuPlacement?: MenuPlacement | undefined;
}) => {
    menuPlacement: MenuPlacement;
    components: {
        Option: (<Option_1, IsMulti_1 extends boolean = false, Group_1 extends GroupBase<Option_1> = GroupBase<Option_1>>({ ...props }: import("react-select").OptionProps<Option_1, IsMulti_1, Group_1>) => JSX.Element) | import("react").ComponentType<import("react-select").OptionProps<Option, IsMulti, Group>>;
        Group?: import("react").ComponentType<import("react-select").GroupProps<Option, IsMulti, Group>> | undefined;
        ClearIndicator?: import("react").ComponentType<import("react-select").ClearIndicatorProps<Option, IsMulti, Group>> | undefined;
        Control: (<Option_2, IsMulti_2 extends boolean, Group_2 extends GroupBase<Option_2> = GroupBase<Option_2>>(controlProps: import("react-select").ControlProps<Option_2, IsMulti_2, Group_2> & {
            selectProps: import("./Select").SelectProps<Option_2, IsMulti_2, Group_2>;
        }) => JSX.Element) | import("react").ComponentType<import("react-select").ControlProps<Option, IsMulti, Group>>;
        DropdownIndicator?: import("react").ComponentType<import("react-select").DropdownIndicatorProps<Option, IsMulti, Group>> | null | undefined;
        DownChevron?: import("react").ComponentType<import("react-select/dist/declarations/src/components/indicators").DownChevronProps> | undefined;
        CrossIcon?: import("react").ComponentType<import("react-select/dist/declarations/src/components/indicators").CrossIconProps> | undefined;
        GroupHeading?: import("react").ComponentType<import("react-select").GroupHeadingProps<Option, IsMulti, Group>> | undefined;
        IndicatorsContainer?: import("react").ComponentType<import("react-select").IndicatorsContainerProps<Option, IsMulti, Group>> | undefined;
        IndicatorSeparator?: import("react").ComponentType<import("react-select").IndicatorSeparatorProps<Option, IsMulti, Group>> | null | undefined;
        Input: (<Option_3, IsMulti_3 extends boolean = false, Group_3 extends GroupBase<Option_3> = GroupBase<Option_3>>({ inputClassName, ...props }: import("react-select").InputProps<Option_3, IsMulti_3, Group_3>) => JSX.Element) | import("react").ComponentType<import("react-select").InputProps<Option, IsMulti, Group>>;
        LoadingIndicator?: import("react").ComponentType<import("react-select").LoadingIndicatorProps<Option, IsMulti, Group>> | undefined;
        Menu?: import("react").ComponentType<import("react-select").MenuProps<Option, IsMulti, Group>> | undefined;
        MenuList?: import("react").ComponentType<import("react-select").MenuListProps<Option, IsMulti, Group>> | undefined;
        MenuPortal?: import("react").ComponentType<import("react-select/dist/declarations/src/components/Menu").MenuPortalProps<Option, IsMulti, Group>> | undefined;
        LoadingMessage?: import("react").ComponentType<import("react-select").NoticeProps<Option, IsMulti, Group>> | undefined;
        NoOptionsMessage?: import("react").ComponentType<import("react-select").NoticeProps<Option, IsMulti, Group>> | undefined;
        MultiValue?: import("react").ComponentType<import("react-select").MultiValueProps<Option, IsMulti, Group>> | undefined;
        MultiValueContainer?: import("react").ComponentType<import("react-select").MultiValueGenericProps<Option, IsMulti, Group>> | undefined;
        MultiValueLabel?: import("react").ComponentType<import("react-select").MultiValueGenericProps<Option, IsMulti, Group>> | undefined;
        MultiValueRemove?: import("react").ComponentType<import("react-select").MultiValueRemoveProps<Option, IsMulti, Group>> | undefined;
        Placeholder?: import("react").ComponentType<import("react-select").PlaceholderProps<Option, IsMulti, Group>> | undefined;
        SelectContainer?: import("react").ComponentType<import("react-select").ContainerProps<Option, IsMulti, Group>> | undefined;
        SingleValue?: import("react").ComponentType<import("react-select").SingleValueProps<Option, IsMulti, Group>> | undefined;
        ValueContainer?: import("react").ComponentType<import("react-select").ValueContainerProps<Option, IsMulti, Group>> | undefined;
    };
    unstyled: boolean;
};
//# sourceMappingURL=selectTheme.d.ts.map