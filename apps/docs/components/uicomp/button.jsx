import cn from "classnames"

export const sizes = ["sm", "smb", "base", "lg"]
export const types = ["default", "info", "success", "error", "warning"]
export const variants = ["default", "pill", "secondary", "ghost", "link"]

export const Gallery = () => {
  const buttons = sizes.map(size => (
    <div className="prose mb-8">
      <h3>Size: {size}</h3>
      {types.map(type => (
        <div className="grid grid-cols-6 gap-2 mb-2">
          {variants.map(variant => (
            <Button size={size} type={type} variant={variant}>Hello</Button>
          ))}
        </div>
      ))}
    </div>))

  return <div>
      { buttons }
    </div>
}

export const normalizeSize = (s) =>
  ["sm", "smb", "lg"].includes(s) ? s : "base";

export const normalizeType = (s) => {
  return ["info", "success", "error", "warning"].includes(s)
    ? s
    : "default";
};

export const normalizeVariant = (s) => {
  return ["ghost", "link", "shadow", "pill", "secondary"].includes(s) ? s : "default";
};

export const Button = ({
  size,
  type,
  variant,
  width,
  onClick,
  disabled,
  reset,
  className,
  style,
  Component,
  children,
  ...props
}) => {
  const Comp = (props.href && !Component) ? "a" : (Component || "button")
  const _size = normalizeSize(size)
  const _type = normalizeType(type)
  const _variant = normalizeVariant(variant)
  const isPlain = _variant === "default" || _variant === "pill"
  const isGhost = _variant === "ghost"
  const isLink = _variant === "link"
  return <Comp
      style={{ ...style, ...(width != null ? { width } : {}) }}
      className={cn(
        className,
        "not-prose no-underline leading-none whitespace-nowrap font-medium duration-150 select-none overflow-hidden truncate transform focus:outline-2 focus:outline-offset-2 outline-sky-500",
        {
          "rounded-lg": _variant !== "pill",
          "rounded-full uppercase": _variant === "pill",
          "text-sm leading-5": _size === "sm",
          "text-smb leading-5": _size === "smb" || _size === "base",
          "text-lg": _size === "lg",
          ...(!isLink ?
            {
              "px-4 py-1.5": _size === "sm",
              "px-3 md:px-4 py-2": _size === "smb",
              "pl-4 pr-4 py-3": _size === "base",
              "px-8 py-5": _size === "lg",
            } : {}
          ),
          "shadow-md hover:shadow-lg": _variant === "shadow",
          "bg-neutral-500 text-gray-200 cursor-not-allowed": disabled,
          "hover:shadow-lg": _size !== "sm" && _size !== "smb" && isPlain && variant !== "pill",
          "border-0 border-b-0": variant !== "secondary",
          // Plain colors
          "bg-primary-700 hover:bg-neutral-700 text-white": _type === "default" && isPlain,
          "bg-sky-500 hover:bg-neutral-900 text-white": _type === "info" && isPlain,
          "bg-green-500 hover:bg-neutral-900 text-white": _type === "success" && isPlain,
          "bg-rose-500 hover:bg-neutral-900 text-white": _type === "error" && isPlain,
          "bg-amber-400 hover:bg-neutral-900 text-white": _type === "warning" && isPlain,
          // Secondary
          "border bg-neutral-50 hover:bg-neutral-100 transition text-neutral-900": _type === "default" && variant === "secondary",
          "border bg-neutral-50 hover:bg-neutral-100 transition text-sky-500": _type === "info" && variant === "secondary",
          "border bg-neutral-50 hover:bg-neutral-100 transition text-green-500": _type === "success" && variant === "secondary",
          "border bg-neutral-50 hover:bg-neutral-100 transition text-rose-500": _type === "error" && variant === "secondary",
          "border bg-neutral-50 hover:bg-neutral-100 transition text-amber-400": _type === "warning" && variant === "secondary",
          // Light
          "text-neutral-900": _type === "default" && !isPlain,
          "text-sky-500": _type === "info" && !isPlain,
          "text-green-500": _type === "success" && !isPlain,
          "text-rose-500": _type === "error" && !isPlain,
          "text-amber-400": _type === "warning" && !isPlain,
          // Ghost
          "bg-white hover:bg-neutral-100": _type === "default" && isGhost,
          "bg-white hover:bg-sky-50": _type === "info" && isGhost,
          "bg-white hover:bg-green-50": _type === "success" && isGhost,
          "bg-white hover:bg-rose-50": _type === "error" && isGhost,
          "bg-white hover:bg-amber-50": _type === "warning" && isGhost,
          // Link
          "hover:text-neutral-900": isLink,
        }
      )}
      onClick={onClick}
      disabled={!!disabled}
      {...props}
    >
      {children}
    </Comp>
}
