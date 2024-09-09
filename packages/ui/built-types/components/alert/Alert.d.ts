import type { ReactNode } from "react";
import { type IconName } from "../..";
export interface AlertProps {
    title?: ReactNode;
    message?: ReactNode;
    actions?: ReactNode;
    className?: string;
    iconClassName?: string;
    severity: "success" | "warning" | "error" | "info" | "neutral" | "green";
    CustomIcon?: IconName;
    customIconColor?: string;
}
export declare const Alert: import("react").ForwardRefExoticComponent<AlertProps & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=Alert.d.ts.map