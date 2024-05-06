import cn from "classnames"
import { TrafficLights } from "@components/uicomp/traffic-lights"

export const Browser = ({ baseUrl, path, shadow, bleed, className }) => {
  return (
    <div className={cn(
          className,
          {
            "w-[calc(100%+33px)] ml-[-16px]": bleed
          }
        )}>
      <div className={cn(
        "border border-neutral-200 rounded-t-lg rounded-b overflow-hidden",
          {
            "shadow-xl": shadow
          }
        )}>
        <div className="flex flex-row w-full bg-white px-5 py-3 gap-x-2 items-center">
          <TrafficLights noPadding />
          <svg
            className="ml-2 h-5 w-5 text-neutral-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <svg
            className="h-5 w-5 text-neutral-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <div className="flex flex-1 justify-center">
            <div className="flex-1 bg-neutral-50 border border-neutral-200 rounded-md px-2 py-[6px] mx-2 max-w-xs text-center text-xs text-lightBlue-500 truncate select-none">
              {baseUrl}
              <span className="text-neutral-400">/{path}</span>
            </div>
          </div>
          <div className="w-12" />
        </div>
        <div className="w-full bg-neutral-100 border-t border-neutral-200 h-6" />
      </div>
    </div>
  )
}
