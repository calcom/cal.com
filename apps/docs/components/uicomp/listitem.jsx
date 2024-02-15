import * as React from "react"
import cn from "classnames"
import { CheckLine } from "@components/icons-alt/check"

export const getColorClassName = (color, onDark) => {
  if (onDark) {
    switch (color) {
      case "sky": return "bg-sky-500 text-white"
      case "green": return "bg-green-500 text-white"
      case "transparent": return "bg-white/20 text-white"
      default: return "bg-white text-neutral-900"
    }
  } else {
    switch (color) {
      case "sky": return "bg-sky-100 text-sky-500"
      case "green": return "bg-green-100 text-green-500"
      case "transparent": return "bg-black/30 text-white"
      default: return "bg-neutral-100 text-neutral-500"
    }
  }
}

export const RoundCheck = ({ color, onDark, className }) => {
  return <div className={`${className} ${getColorClassName(color, onDark)} rounded-full p-[3px]`}>
      <CheckLine className="w-full h-full stroke-[3px]" />
    </div>
}

export const UL = ({ color, onDark, className, children }) => {
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { color, onDark });
    }
    return child;
  })

  return <ul className={className}>{childrenWithProps}</ul>
}

export const LI = ({ color, onDark, children }) => {
  return <li className={cn("relative pl-8 mb-1.5 text-smb", {
    "text-white": onDark
  })}>
      <RoundCheck color={color} onDark={onDark} className="w-[18px] absolute left-0 top-[3px]" />
      { children }
    </li>
}

<div className="p-8 bg-neutral-900">
  <UL color="transparent" onDark>
    <LI>Hello</LI>
    <LI>Hello</LI>
    <LI>Hello</LI>
  </UL>
</div>