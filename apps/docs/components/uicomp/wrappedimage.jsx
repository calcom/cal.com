import cn from "classnames"
import { Wrapper } from "@components/uicomp/wrapper"

export const WrappedImage = ({ src, alt, className, type, bleed, background, legend, bordered }) => {
  return <Wrapper bleed={bleed} background={background} legend={legend}>
      <img
          src={src}
          alt={alt}
          className={cn(
            className,
            {
              "rounded-md border border-neutral-200": bordered,
            })}
        />
    </Wrapper>
}
