import cn from "classnames"
import { Section } from "@components/uicomp/section"
import { Button } from "@components/uicomp/button"

export const getHeadingColorClass = (theme) => {
  switch (theme) {
    case "sky": return "text-sky-500"
    case "rose": return "text-rose-500"
    default: return "text-neutral-900"
  }
}

export const isDark = (background) => {
  return background === "dark"
}

export const getSpanClass = (span) => {
  switch (span) {
    case 1: return "sm:col-span-1 md:col-span-1"
    case 2: return "sm:col-span-2 md:col-span-2"
    case 3: return "sm:col-span-2 md:col-span-3"
    default: return "sm:col-span-2 md:col-span-4"
  }
}

export const Title = ({ onDark, size = "lg", children }) => {
  return <h1 className={cn(
      "font-bold", {
        "text-4xl": size === "lg",
        "text-3xl": size === "md",
        "text-neutral-900": !onDark,
        "text-white": onDark,
      })}>
      { children }
    </h1>
}

export const Heading = ({ theme, children }) => {
  return <h2 className={cn(
      "text-base sm:text-lg font-semibold",
      getHeadingColorClass(theme))}>
        { children }
      </h2>
}

export const Subtitle = ({ theme, onDark, children }) => {
  return <p className={cn(
      "showcase-subtitle text-lg",
      {
        "text-neutral-600": !onDark,
        "text-white/70": onDark,
      }
    )}>
        { children }
      </p>
}

export const SectionRow = ({ span, children }) => {
  return <>
      <div className={getSpanClass(span)}>
        {children}
      </div>
      { (span < 4) &&
        <div className={`hidden md:block ${getSpanClass(4-span)}`} />
      }
    </>
}

export const ShowcaseSection = ({
  title,
  heading,
  subtitle,
  cta,
  ctaHref,
  theme,
  background,
  titleSpan,
  subtitleSpan,
  padding,
  children
}) => {
  const onDark = isDark(background)
  return <Section background={background} padding={padding || "2xl"} yGap="lg" full>
      {children}
    </Section>
}

<ShowcaseSection
    title="We set you up with a world-class frontend stack, so you don't have to"
    heading="Out-of-the-box greatness"
    subtitle="Out-of-the-box greatness"
    titleSpan={3}
    subtitleSpan={3}
    theme="rose"
    background="dark"
    >
  </ShowcaseSection>