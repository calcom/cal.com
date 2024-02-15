import { useCallback, useRef, useState } from "react"
import cn from "classnames"

export const VideoPlayer = ({ src, title, className, Overlay }) => {
  const [isOverlayVisible, setOverlayVisible] = useState(true)
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

  return <div className="relative w-full rounded-lg overflow-hidden shadow-2xl h-[400px] sm:h-[500px] md:h-[576px]">
      <Overlay
          onClick={play}
          className={cn(
            "absolute left-0 right-0 top-0 bottom-0 transition duration-500 group cursor-pointer",
            {
              "opacity-0 pointer-events-none": !isOverlayVisible
            }
          )}>
        <div className="p-4 rounded-full bg-white bg-opacity-80 group-hover:bg-opacity-100 transition shadow-lg transform group-hover:scale-105 duration-300">
          <Play className="text-neutral-900 w-12 h-12 transform translate-x-1"/>
        </div>
        <div className="absolute left-0 right-0 top-0 bottom-0 pointer-events-none opacity-80"></div>
      </Overlay>
      <iframe ref={playerRef}
        className={cn("w-full overflow-hidden rounded-md shadow-lg h-full transition duration-500", {
          "opacity-0": isOverlayVisible
        })}
        src={src}
        title={title}
        scrolling="no"
        frameborder="0"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
    </div>
}

import { Timeline } from "@components/illustrations/timeline"

<VideoPlayer
    noPadding
    title="The fastest way for developers to publish content"
    src="https://www.youtube-nocookie.com/embed/7sDNg10pB5Q?origin=https://motif.land"
    playLabel="Watch how"
    playPosition="bottom"
    Overlay={Timeline}
  />