import { useCallback, useRef, useState } from "react"
import cn from "classnames"
import { ChevronDown } from "@components/icons-alt/chevron-down"

export const Collapse = ({ title, children }) => {
  const contentRef = useRef()
  const [state, setState] = useState({ open: false, height: 0 })

  const toggleOpen = useCallback(() => {
    setState(s => {
      if (s.open) {
        return { open: false, height: 0 }
      } else {
        return { open: true, height: contentRef.current.scrollHeight }
      }
    })
  }, [])

  return <div className="flex flex-col border rounded-lg mb-4">
      <div
        className="not-prose flex flex-row items-center gap-4 cursor-pointer p-4 group text-neutral-900"
        onClick={toggleOpen}
        >
        <h2 className="font-semibold flex-grow select-none transition group-hover:text-neutral-500">{ title }</h2>
        <ChevronDown
          className={cn(
            "w-6 h-6 flex-none transform duration-300 text-neutral-400 transition",
            { "rotate-180": state.open }
          )}
        />
      </div>
      <div
        ref={contentRef}
        style={{ height: state.height }}
        className="collapse-content overflow-hidden transition-all duration-200 prose prose-neutral max-w-none px-4">
          <div className="mt-1 mb-4">
            {children}
          </div>
      </div>
    </div>
}
