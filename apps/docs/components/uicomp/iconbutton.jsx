export const IconButton = ({
  Icon,
  Component = "button",
  ariaLabel,
  ...props
}) => {
  return <Component className="block cursor-pointer p-1.5 rounded-md hover:bg-black/5 transition outline-none" aria-label={ariaLabel} {...props}>
      <Icon className="w-6 h-6 text-neutral-900" />
    </Component>
}
