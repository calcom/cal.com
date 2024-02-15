import Link from "next/link"
import { forwardRef, useCallback, useEffect, useRef, useState } from "react"

export const TabBarItem = ({ item, selected, onMouseEnter, className, selectedClassName }) => {
  return <Link
      onMouseEnter={(e) => onMouseEnter(e.currentTarget.getBoundingClientRect())}
      className={`${className} ${selected ? (selectedClassName || "") : ""}`}
      href={item.href}
      target={item.target || "_self"}>
        { item.label }
    </Link>
}

export const Ghost = ({ rect, parentRect, visible, className }) => {
  return <div
      style={{
        opacity: visible ? 1 : 0,
        ...(rect ? {
        left: rect.left - parentRect.left,
        top: rect.top - parentRect.top,
        width: rect.width,
        height: rect.height,
        zIndex: -1
      } : {})}}
      className={`absolute transition-all duration-200 ${className || "rounded-md bg-black/5"}`}
    />
}

export const AnimatedTabBar = ({ items, selectedIndex, linkClassName, linkSelectedClassName, ghostClassName }) => {
  const containerRef = useRef()
  const [state, setState] = useState({ rect: undefined, visible: false })

  return <div
      ref={containerRef}
      className="relative flex flex-row gap-1 md:gap-3"
      onMouseLeave={() => { setState(s => ({ ...s, visible: false}))}}>
      { items?.map((item, i) => {
        return <TabBarItem
            key={`tab-bar-item-${i}`}
            onMouseEnter={(r) => { setState({ rect: r, visible: true })}}
            item={item}
            selected={selectedIndex === i}
            className={linkClassName}
            selectedClassName={linkSelectedClassName}
          />
      })}
      <Ghost
        className={ghostClassName}
        rect={state.rect}
        visible={state.visible}
        parentRect={containerRef.current?.getBoundingClientRect()} />
    </div>
}
