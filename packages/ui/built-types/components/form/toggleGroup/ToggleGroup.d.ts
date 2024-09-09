import * as RadixToggleGroup from "@radix-ui/react-toggle-group";
import type { ReactNode } from "react";
interface ToggleGroupProps extends Omit<RadixToggleGroup.ToggleGroupSingleProps, "type"> {
    options: {
        value: string;
        label: string | ReactNode;
        disabled?: boolean;
        tooltip?: string;
        iconLeft?: ReactNode;
    }[];
    isFullWidth?: boolean;
}
export declare const ToggleGroup: ({ options, onValueChange, isFullWidth, customClassNames, ...props }: ToggleGroupProps & {
    customClassNames?: string | undefined;
}) => JSX.Element;
export {};
//# sourceMappingURL=ToggleGroup.d.ts.map