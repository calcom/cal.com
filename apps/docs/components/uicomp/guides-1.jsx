export const getGuideColor = (onDark) => {
  return onDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
}

export const VerticalGuide = ({ onDark }) => {
  const guideColor = getGuideColor(onDark)
  return <div
    className="h-full w-[1px] bg-clip-border bg-scroll"
    style={{
      background: `linear-gradient(180deg,${guideColor},${guideColor} 50%,transparent 0,transparent)`,
      backgroundSize: "1px 6px",
      }}
    />
}

export const HorizontalGuide = ({ className, onDark }) => {
  const guideColor = getGuideColor(onDark)
  return <div
    className={`w-full h-[1px] bg-clip-border bg-scroll ${className}`}
    style={{
      background: `linear-gradient(90deg,${guideColor},${guideColor} 50%,transparent 0,transparent)`,
      backgroundSize: "6px 1px"
      }}
    />
}

export const Guides = ({ onDark }) => {
  return <div className="pointer-events-none z-0 absolute top-0 bottom-0 left-0 right-0">
      <div className="h-full w-full max-w-[90rem] mx-auto">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 h-full">
          <VerticalGuide onDark={onDark} />
          <VerticalGuide onDark={onDark} />
          <VerticalGuide onDark={onDark} />
          <div className="relative">
            <VerticalGuide onDark={onDark} />
            <div className="absolute right-0 top-0 h-full">
              <VerticalGuide onDark={onDark} />
            </div>
          </div>
        </div>
      </div>
    </div>
}
