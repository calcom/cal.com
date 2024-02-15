import { Bleed } from "@components/uicomp/bleed-1"

export const CodeSample = ({ panelClassName, noPadding, bleed = true, children }) => {
  return (
    <Bleed bleed={bleed}>
      <div className="my-8 bg-grid-neutral-100 flex flex-col overflow-hidden bg-neutral-50 border border-neutral-200 rounded-md ">
        <div className={`px-8 py-4 ${panelClassName || ""}`}>
          {children.slice(0, -1)}
        </div>
        <div className="bg-neutral-900 px-2 -mb-2 max-h-[300px] overflow-y-auto not-prose">
          <div className="mt-[-10px]">{children.slice(-1)}</div>
        </div>
      </div>
    </Bleed>
  )
}

export const CodeResult = ({ children, className }) => {
  return (
    <div
      className={`p-8 bg-neutral-50 border border-neutral-200 rounded-md mb-2 ${className}`}
    >
      {children}
    </div>
  )
}
