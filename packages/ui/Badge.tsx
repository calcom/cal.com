import { Icon } from "react-feather";

import classNames from "@calcom/lib/classNames";

export type BadgeProps = {
  variant: "default" | "success" | "gray" | "blue" | "green" | "orange" | "red" | "warning" | "error";
  size?: "default" | "lg";
  StartIcon?: Icon;
} & JSX.IntrinsicElements["div"];

export const Badge = function Badge(props: BadgeProps) {
  const { variant, className, size = "default", StartIcon, ...passThroughProps } = props;

  const classNameBySize = {
    default: !StartIcon ? "h-5" : "",
    lg: !StartIcon ? "h-6" : "",
  };

  const classNameByVariant = {
    default: "bg-orange-100 text-orange-800",
    warning: "bg-orange-100 text-orange-800",
    orange: "bg-orange-100 text-orange-800",
    success: "bg-green-100 text-green-800",
    green: "bg-green-100 text-green-800",
    gray: "bg-gray-200 text-gray-800",
    blue: "bg-blue-100 text-blue-800",
    red: "bg-red-100 text-red-800",
    error: "bg-red-100 text-red-800",
  };

  return (
    <div
      {...passThroughProps}
      className={classNames(
        "inline-flex items-center justify-center rounded py-0.5 px-[6px] text-sm font-semibold",
        classNameBySize[size],
        classNameByVariant[variant],
        StartIcon ? "w-15" : "w-[49px] ",
        className
      )}>
      <>
        {StartIcon && <StartIcon className="stroke-3 mr-1 h-3 w-3" />}
        {props.children}
      </>
    </div>
  );
};

export default Badge;
