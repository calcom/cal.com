import cn from "classnames"

export const TrafficLights = ({ className, noPadding, rightAccessory, dark, compact }) => {
  return (
    <div className={cn(
        "flex flex-row items-center pr-4",
        className,
        {
          "bg-blueGray-900": !!dark
        }
      )}>
      <div
        className={cn(
          "flex flex-row flex-grow items-center",
          {
            "px-0 py-0": noPadding,
            "px-4 py-4": !noPadding,
          }
        )}>
        <TrafficLightDot red small={compact} />
        <TrafficLightDot orange small={compact} />
        <TrafficLightDot green small={compact} />
      </div>
      { rightAccessory &&
        <div className="flex-none">
          {rightAccessory}
        </div>
      }
    </div>
  )
}

export const TrafficLightDot = ({ red, orange, green, small}) => {
  return <div className={cn(
      "rounded-full",
      {
        "bg-red-500": red,
        "bg-yellow-500": orange,
        "bg-green-500": green,
        "w-3 h-3 mr-2": !small,
        "w-[11px] h-[11px] mr-1.5": small
      }
    )} />
}

<TrafficLights />
