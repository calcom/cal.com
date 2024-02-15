import cn from "classnames"

export const Bleed = ({ left, right, hfull, children }) => {
  let className = "w-[calc(100%+33px)] ml-[-16px]"
  {/* On mobile, bleed both left and right even for only-left
      or only-right components, since in practice mobule
      layouts are 1-column, so we don't want this shift. */}
  if (left && !right) {
    className = "w-[calc(100%+33px)] sm:w-[calc(100%+17px)] ml-[-16px]"
  } else if (right && !left) {
    className = "w-[calc(100%+33px)] sm:w-[calc(100%+17px)] ml-[-16px] sm:ml-0"
  }
  return <div className={className}>
      {children}
    </div>
}
