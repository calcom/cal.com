import { cn } from "~/lib/utils";


export function Container({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cn('lg:px-8', className)} {...props}>
      <div className="lg:max-w-4xl">
        <div className="mx-auto px-4 sm:px-6 md:max-w-2xl md:px-4 lg:px-0">
          {children}
        </div>
      </div>
    </div>
  )
}
