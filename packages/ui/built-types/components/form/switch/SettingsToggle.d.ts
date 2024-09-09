import type { ReactNode } from "react";
type Props = {
    children?: ReactNode;
    title: string;
    description?: string | React.ReactNode;
    checked: boolean;
    disabled?: boolean;
    LockedIcon?: React.ReactNode;
    Badge?: React.ReactNode;
    onCheckedChange?: (checked: boolean) => void;
    "data-testid"?: string;
    tooltip?: string;
    toggleSwitchAtTheEnd?: boolean;
    childrenClassName?: string;
    switchContainerClassName?: string;
    labelClassName?: string;
    descriptionClassName?: string;
};
declare function SettingsToggle({ checked, onCheckedChange, description, LockedIcon, Badge, title, children, disabled, tooltip, toggleSwitchAtTheEnd, childrenClassName, switchContainerClassName, labelClassName, descriptionClassName, ...rest }: Props): JSX.Element;
export default SettingsToggle;
//# sourceMappingURL=SettingsToggle.d.ts.map