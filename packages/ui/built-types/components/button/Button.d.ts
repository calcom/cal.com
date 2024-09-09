import type { VariantProps } from "class-variance-authority";
import type { LinkProps } from "next/link";
import React from "react";
import { type IconName } from "../..";
type InferredVariantProps = VariantProps<typeof buttonClasses>;
export type ButtonColor = NonNullable<InferredVariantProps["color"]>;
export type ButtonBaseProps = {
    /** Action that happens when the button is clicked */
    onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
    /**Left aligned icon*/
    CustomStartIcon?: React.ReactNode;
    StartIcon?: IconName;
    /**Right aligned icon */
    EndIcon?: IconName;
    shallow?: boolean;
    /**Tool tip used when icon size is set to small */
    tooltip?: string | React.ReactNode;
    tooltipSide?: "top" | "right" | "bottom" | "left";
    tooltipOffset?: number;
    disabled?: boolean;
    flex?: boolean;
} & Omit<InferredVariantProps, "color"> & {
    color?: ButtonColor;
};
export type ButtonProps = ButtonBaseProps & ((Omit<JSX.IntrinsicElements["a"], "href" | "onClick" | "ref"> & LinkProps) | (Omit<JSX.IntrinsicElements["button"], "onClick" | "ref"> & {
    href?: never;
}));
export declare const buttonClasses: (props?: ({
    variant?: "button" | "icon" | "fab" | null | undefined;
    color?: "minimal" | "secondary" | "primary" | "destructive" | null | undefined;
    size?: "base" | "sm" | "lg" | null | undefined;
    loading?: boolean | null | undefined;
} & import("class-variance-authority/dist/types").ClassProp) | undefined) => string;
export declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement | HTMLAnchorElement>>;
export {};
//# sourceMappingURL=Button.d.ts.map