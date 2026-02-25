import { cn } from "@coss/ui/lib/utils";

function AppHeader({ className, ...props }: React.ComponentProps<"header">) {
  return <header className={cn("mb-6 flex items-start justify-between gap-4", className)} {...props} />;
}

function AppHeaderContent({
  children,
  className,
  title,
  ...props
}: React.ComponentProps<"div"> & { title: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      <h1 className="font-heading font-semibold text-lg leading-none">{title}</h1>
      {children}
    </div>
  );
}

function AppHeaderDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-muted-foreground text-sm max-md:hidden", className)} {...props} />;
}

function AppHeaderActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-2", className)} {...props} />;
}

export { AppHeader, AppHeaderActions, AppHeaderContent, AppHeaderDescription };
