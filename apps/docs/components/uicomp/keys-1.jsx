import cn from "classnames"
import { getOS } from "@utils/os"
import { useEffect, useState } from "react"

export const Keys = ({
  cmd,
  shift,
  alt,
  hatCtrl,
  chars,
  char,
  backslash,
  plain,
  small,
  large,
  dark,
  onDark,
}) => {
  const [macLike, setMacLike] = useState(false)

  useEffect(() => {
    const os = getOS()
    if (!os) {
      return
    }

    setMacLike(os === "mac")
  }, [])

  return (
    <span
      className={cn(
        "inline-block font-medium antialiased mx-0.5 mt-0 mb-0 select-none",
        {
          "text-xs": small,
          "text-lg": large,
          "text-primary-200 opacity-70": plain && !onDark,
          "text-white/80": onDark,
          "border-white/30": !plain && onDark,
          "px-1 py-[1px] border rounded": !plain,
          "border-neutral-200 text-neutral-500 text-opacity-80":
            !plain && !onDark,
          "bg-neutral-100": dark && !plain && !onDark,
          "bg-neutral-50": !dark && !plain && !onDark,
          "bg-white/20": onDark,
        }
      )}
    >
      {cmd && <span className="px-[2px]">{macLike ? "⌘" : "Ctrl"}</span>}
      {hatCtrl && <span className="px-[2px]">{macLike ? "^" : "Ctrl"}</span>}
      {shift && <span className="px-[2px]">⇧</span>}
      {alt && <span className="px-[2px]">{macLike ? "⌥" : "Alt"}</span>}
      {chars &&
        chars.map((c, i) => (
          <span key={`key-${i}-${c}`} className="px-[2px]">
            {c}
          </span>
        ))}
      {char && <span className="px-[2px]">{char}</span>}
      {backslash && <span className="px-[2px]">\</span>}
    </span>
  )
}

export const MiniKey = ({ symbol, variable }) => {
  return (
    <div
      className={`inline-block items-center text-center justify-center h-5 bg-neutral-100 border border-neutral-300 rounded text-neutral-500 text-xs font-medium select-none transform translate-y-[-2px] mt-0 mb-0 ${
        !variable ? "w-5" : "px-1"
      }`}
    >
      <div
        style={{ marginTop: 0 }}
        className="w-full h-full flex items-center align-center justify-center"
      >
        {symbol}
      </div>
    </div>
  )
}

export const Cmd = () => {
  const os = getOS()
  if (!os) {
    {/* Only load on client side, so we have the correct os value */}
    return <></>
  }
  const macLike = os === "mac"
  return macLike ? <CmdMac /> : <CmdWin />
}

export const CmdMac = () => <MiniKey variable={false} symbol="⌘" />

export const CmdWin = () => <MiniKey variable={true} symbol="Ctrl" />

export const AltMac = () => <MiniKey variable={false} symbol="⌥" />

export const AltWin = () => <MiniKey variable={true} symbol="Alt" />

export const Shift = () => <MiniKey variable={false} symbol="⇧" />

export const HatCtrlMac = () => <MiniKey variable={false} symbol="^" />

export const HelpButton = () => (
  <span className="inline-block rounded-full bg-blueGray-900 text-white w-5 h-5 mt-0 mb-0">
    <span
      className="flex w-full h-full justify-center align-center"
      style={{ marginTop: -4 }}
    >
      ?
    </span>
  </span>
)
