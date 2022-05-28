import { Icon } from "react-feather";

import classNames from "@calcom/lib/classNames";

export type BadgeProps = {
  variant: "default" | "success" | "gray" | "blue" | "green" | "orange" | "red" | "warning" | "error";
  size?: "default" | "lg";
  StartIcon?: Icon;
} & JSX.IntrinsicElements["div"];

export const Badge = function Badge(props: BadgeProps) {
  const { variant, className, size = "default", StartIcon, ...passThroughProps } = props;

  return (
    <div
      {...passThroughProps}
      className={classNames(
        "inline-flex w-[49px] items-center justify-center rounded py-0.5 px-[6px] text-sm ",
        size === "default" && !StartIcon && "h-5 font-semibold",
        size === "lg" && !StartIcon && "h-6 font-normal",
        (variant === "default" || variant == "warning" || variant == "orange") &&
          "bg-orange-100 text-orange-800",
        (variant === "success" || variant === "green") && "bg-green-100 text-green-800",
        variant === "gray" && "bg-brand-200 text-gray-800",
        variant === "blue" && "bg-blue-100 text-blue-800",
        (variant === "red" || variant === "error") && "bg-red-100 text-red-800",
        StartIcon && "w-15",
        className
      )}>
      <>
        {StartIcon && <StartIcon />}
        {props.children}
      </>
    </div>
  );
};

export default Badge;
