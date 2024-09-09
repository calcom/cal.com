/// <reference types="react" />
import * as Popover from "@radix-ui/react-popover";
export type ColorPickerProps = {
    defaultValue: string;
    onChange: (text: string) => void;
    container?: HTMLElement;
    popoverAlign?: React.ComponentProps<typeof Popover.Content>["align"];
    className?: string;
    resetDefaultValue?: string;
};
declare const ColorPicker: (props: ColorPickerProps) => JSX.Element;
export default ColorPicker;
//# sourceMappingURL=colorpicker.d.ts.map