import { useCallback, useRef, useState } from "react"
import cn from "classnames"
import { Play } from "@components/icons-alt/play"

export const Video = ({ src, title, bleed, noPadding, playPosition, playLabel, Overlay }) => {
  const [isOverlayVisible, setOverlayVisible] = useState(!!Overlay)
  const playerRef = useRef()

  const play = useCallback(() => {
    if (!playerRef.current) {
      return
    }
    setOverlayVisible(false)
    setTimeout(() => {
      playerRef.current.src = playerRef.current.src + '&autoplay=1'
    }, 500)
  }, [])

  return <div className={cn("relative group", { "my-8": !noPadding })}>
        <div
          className={cn("relative w-full pb-[55%] h-0",
            {
              "w-[calc(100%+33px)] ml-[-16px]": bleed
            })}
          style={{ height: 0 }}
        >
      <iframe
        ref={playerRef}
        title={title}
        className={cn(
          "absolute top-0 left-0 w-full h-full",
          {
            "opacity-0": isOverlayVisible,
          })}
        src={src}
        scrolling="no"
        webkitallowfullscreen
        mozallowfullscreen
        allowfullscreen
      ></iframe>
      <div
        onClick={play}
        className={cn(
          "absolute z-40 h-full w-full cursor-pointer transition",
          { "hidden pointer-events-none": !isOverlayVisible }
        )}>
        { playPosition === "bottom" &&
          <div className="absolute z-20 bottom-0 left-0 right-0 flex items-center justify-center">
            <div className="mb-8 md:mb-16 bg-white/10 backdrop-blur-lg px-4 py-3 rounded-full hover:bg-white/20 transition duration-200 text-white font-medium flex flex-row gap-2 items-center transform group-hover:scale-105" onClick={play}><Play className="w-4 h-4 sm:w-4 sm:h-4"/>{playLabel || "Play now"}</div>
          </div>
        }
        { Overlay && <Overlay className="absolute z-10 w-full h-full" /> }
      </div>
    </div>
  </div>
}
