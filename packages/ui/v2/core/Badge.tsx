import { Icon } from "react-feather";

import classNames from "@calcom/lib/classNames";

export const badgeClassNameByVariant = {
  default: "bg-orange-100 text-orange-800",
  warning: "bg-orange-100 text-orange-800",
  orange: "bg-orange-100 text-orange-800",
  success: "bg-green-100 text-green-800",
  green: "bg-green-100 text-green-800",
  gray: "bg-gray-200 text-gray-800 dark:bg-transparent dark:text-darkgray-800",
  blue: "bg-blue-100 text-blue-800",
  red: "bg-red-100 text-red-800",
  error: "bg-red-100 text-red-800",
};

const classNameBySize = {
  default: "h-5",
  lg: "h-6",
};

export type BadgeProps = {
  variant: keyof typeof badgeClassNameByVariant;
  size?: keyof typeof classNameBySize;
  StartIcon?: Icon;
  bold?: boolean;
} & JSX.IntrinsicElements["div"];

export const Badge = function Badge(props: BadgeProps) {
  const { variant, className, size = "default", StartIcon, bold, ...passThroughProps } = props;

  return (
    <div
      {...passThroughProps}
      className={classNames(
        "inline-flex items-center justify-center rounded py-0.5 px-[6px] text-sm",
        bold ? "font-semibold" : "font-normal",
        !StartIcon ? classNameBySize[size] : "",
        badgeClassNameByVariant[variant],
        className
      )}>
      <>
        {StartIcon && <StartIcon className="mr-1 h-3 w-3 stroke-[3px]" />}
        {props.children}
      </>
    </div>
  );
};

export default Badge;
