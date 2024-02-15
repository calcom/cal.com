import cn from "classnames"
import { Guides } from "@components/uicomp/guides-1"

export const getBackground = (background) => {
  switch (background) {
    case "light": return "bg-white border border-neutral-200"
    case "extralight": return "bg-primary-50"
    case "transparent": return "bg-transparent"
    case "dark": return "bg-primary-700"
    default: return "bg-primary-50"
  }
}

export const isDark = (background) => {
  return background === "sunrise"
}

export const Section = ({ full, Component = "section", padding, yGap, noPaddingX, hideGuides, background, rounded, className, children }) => {
  return <Component className={cn(
        className,
        "relative",
        getBackground(background),
        {
          "px-4" : !noPaddingX,
          "md:rounded-4xl": rounded
        }
      )}>
      <div className={cn(
          "relative z-10 h-full w-full max-w-[90rem] mx-auto",
          {
            "text-white": background === "dark",
            "py-4": padding === "xs",
            "py-6": padding === "sm",
            "py-12": padding === "base",
            "py-16": padding === "md",
            "py-24": padding === "lg",
            "py-24 sm:py-32": padding === "xl",
            "py-24 sm:py-48": padding === "2xl",
            "py-32 sm:py-64": padding === "3xl",
          },
          { "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-8 items-start": !full,
            "gap-y-4 md:gap-y-8": !full && !yGap,
            "gap-y-2": yGap === 'sm',
            "gap-y-4": yGap === 'md',
            "gap-y-8": yGap === 'lg',
          },
        )}>
        { children }
      </div>
      { false && !hideGuides &&
        <div className="absolute left-4 right-4 top-0 bottom-0 hidden sm:block">
          <Guides onDark={isDark(background)} />
        </div>
      }
    </Component>
}
