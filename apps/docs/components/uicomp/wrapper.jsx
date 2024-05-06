import cn from "classnames"
import { Bleed } from "@components/uicomp/bleed-1"

export const getBackgroundClass = (background) => {
  switch (background) {
    case "beige": return "bg-beige-100"
    case "white": return "bg-white border border-neutral-100"
    case "grid": return "bg-grid-neutral-100 border border-neutral-100"
    default: return  "bg-neutral-50"
  }
}

export const PlainWrapper = ({ background, legend, children }) => {
  return <div className="not-prose block md:grid md:grid-cols-3 my-8">
      <div className={cn(
          "md:col-span-3 flex items-center justify-center px-4 py-8 rounded-md overflow-hidden",
          getBackgroundClass(background)
        )}>
          { children }
        </div>
        { legend && <p className="md:col-span-2 mt-4 text-sm text-neutral-500">
            {legend}
          </p>}
      </div>
}

export const Wrapper = ({ bleed = true, background, legend, children }) => {
  if (bleed) {
    return <Bleed>
        <PlainWrapper background={background} legend={legend}>
          {children}
        </PlainWrapper>
      </Bleed>
  }
  return <PlainWrapper background={background} legend={legend}>
        {children}
      </PlainWrapper>
}
