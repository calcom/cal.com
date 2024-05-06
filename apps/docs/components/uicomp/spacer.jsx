import cn from "classnames"

export const Spacer = ({ size }) => {
  return <div className={cn({
    "h-2": size === "xs",
    "h-4": size === "sm",
    "h-8": size === "base",
    "h-12": size === "md",
    "h-16": size === "lg",
    "h-24": size === "xl",
  })} />
}