import { useEffect, useState, useRef } from 'react'
import cn from "classnames"
import Prism from 'prismjs'
import copy from 'copy-to-clipboard'
import { Copy } from '@components/icons-alt/copy-1'

export function Fence({ children, 'data-language': language }) {
  const [copied, setCopied] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) Prism.highlightElement(ref.current, false)
  }, [children])

  useEffect(() => {
    if (copied) {
      copy(ref.current.innerText)
      const to = setTimeout(setCopied, 1000, false)
      return () => clearTimeout(to)
    }
  }, [copied])

  const lines =
    typeof children === 'string' ? children.split('\n').filter(Boolean) : []

  return (
    <div className="relative code" aria-live="polite">
      <pre
        key={children}
        ref={ref}
        className={`language-${language}`}
      >
        {children}
      </pre>
      <button className={cn(
        "rounded absolute text-neutral-500 right-0 pl-2 pr-4 py-1 bg-black/90", {
          "top-[10px]": lines.length === 1,
          "top-2": lines.length !== 1,
        })} onClick={() => setCopied(true)}>
        <Copy icon={copied ? 'copied' : 'copy'} />
      </button>
      <style jsx>
        {`
          .code {
            position: relative;
          }
        `}
      </style>
    </div>
  )
}
