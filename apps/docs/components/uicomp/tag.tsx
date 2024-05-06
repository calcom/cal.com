import cn from "classnames"
import { TagColor } from "@utils/colors"

export const getColorClass = (color: TagColor) => {
  switch (color) {
    case TagColor.fuchsia: return "bg-fuchsia-50 text-fuchsia-600"
    case TagColor.green: return "bg-green-50 text-green-600"
    case TagColor.sky: return "bg-sky-50 text-sky-600"
    case TagColor.amber: return "bg-amber-50 text-amber-600"
    case TagColor.rose: return "bg-rose-50 text-rose-600"
    case TagColor.violet: return "bg-violet-50 text-violet-600"
    default: return "bg-neutral-50 text-neutral-600"
  }
}

export const Tag = ({ label = "", color = TagColor.neutral, size = "sm", round = false }) => {
  return <span className={cn(
    "font-medium py-1 truncate",
    getColorClass(color),
    {
      "rounded": !round,
      "rounded-full": round,
      "text-xs": size === "xs",
      "text-sm": size === "sm",
      "px-1": !round,
      "px-2": round,
    },
    )}>{ label }</span>
}

export const FileTag = ({ label= "" }) => {
  return <Tag label={label} color={TagColor.fuchsia} />
}