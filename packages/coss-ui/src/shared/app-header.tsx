import { cn } from "@coss/ui/lib/utils";
import type * as React from "react";

export function AppHeader({
  className,
  ...props
}: React.ComponentProps<"header">): React.ReactElement {
  return (
    <header
      className={cn("mb-6 flex items-start justify-between gap-4", className)}
      {...props}
    />
  );
}

export function AppHeaderContent({
  children,
  className,
  title,
  ...props
}: React.ComponentProps<"div"> & { title: string }): React.ReactElement {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      <h1 className="font-heading font-semibold text-lg leading-none">
        {title}
      </h1>
      {children}
    </div>
  );
}

export function AppHeaderDescription({
  className,
  ...props
}: React.ComponentProps<"p">): React.ReactElement {
  return (
    <p
      className={cn("text-muted-foreground text-sm max-md:hidden", className)}
      {...props}
    />
  );
}

export function AppHeaderActions({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props} />
  );
}

