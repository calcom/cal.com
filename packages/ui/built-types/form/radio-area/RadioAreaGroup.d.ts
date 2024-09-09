import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ReactNode } from "react";
type RadioAreaProps = RadioGroupPrimitive.RadioGroupItemProps & {
    children: ReactNode;
    classNames?: {
        container?: string;
    };
};
declare const RadioArea: ({ children, className, classNames: innerClassNames, ...props }: RadioAreaProps) => JSX.Element;
declare const RadioAreaGroup: ({ children, className, onValueChange, ...passThroughProps }: RadioGroupPrimitive.RadioGroupProps) => JSX.Element;
declare const Item: ({ children, className, classNames: innerClassNames, ...props }: RadioAreaProps) => JSX.Element;
declare const Group: ({ children, className, onValueChange, ...passThroughProps }: RadioGroupPrimitive.RadioGroupProps) => JSX.Element;
export { RadioArea, RadioAreaGroup, Item, Group };
//# sourceMappingURL=RadioAreaGroup.d.ts.map