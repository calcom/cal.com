import { cn } from "@coss/ui/lib/utils";
import type { ReactNode } from "react";
import Link from "next/link";

interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

function ListItem({ children, className, ...props }: ListItemProps) {
  return (
    <div
      {...props}
      className={cn(
        "not-last:border-b bg-clip-padding transition-[background-color] first:rounded-t-[calc(var(--radius-xl)+1px)] last:rounded-b-[calc(var(--radius-xl)+1px)] has-[[data-slot=list-item-title]_a:hover]:z-1 has-[[data-slot=list-item-title]_a:hover]:bg-[color-mix(in_srgb,var(--card),var(--color-black)_2%)] dark:has-[[data-slot=list-item-title]_a:hover]:bg-[color-mix(in_srgb,var(--card),var(--color-white)_2%)]",
        className
      )}
      data-slot="list-item">
      <div className="relative flex items-center justify-between gap-4 px-6 py-4">{children}</div>
    </div>
  );
}

interface ListItemContentProps {
  children: ReactNode;
  className?: string;
}

function ListItemContent({ children, className }: ListItemContentProps) {
  return <div className={cn("flex min-w-0 flex-1 flex-col gap-3", className)}>{children}</div>;
}

interface ListItemHeaderProps {
  children: ReactNode;
  className?: string;
}

function ListItemHeader({ children, className }: ListItemHeaderProps) {
  return <div className={cn("flex flex-col gap-1", className)}>{children}</div>;
}

interface ListItemTitleProps {
  children: ReactNode;
  className?: string;
}

function ListItemTitle({ children, className }: ListItemTitleProps) {
  return (
    <h2 className={cn("font-semibold sm:text-sm", className)} data-slot="list-item-title">
      {children}
    </h2>
  );
}

function ListItemTitleLink({ children, className, href }: ListItemTitleProps & { href: string }) {
  return (
    <Link className={cn("before:absolute before:inset-0", className)} data-slot="list-item-title-link" href={href}>
      {children}
    </Link>
  );
}

interface ListItemDescriptionProps {
  children: ReactNode;
  className?: string;
}

function ListItemDescription({ children, className }: ListItemDescriptionProps) {
  return (
    <p className={cn("text-muted-foreground text-sm", className)} data-slot="list-item-description">
      {children}
    </p>
  );
}

interface ListItemBadgesProps {
  children: ReactNode;
  className?: string;
}

function ListItemBadges({ children, className }: ListItemBadgesProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} data-slot="list-item-badges">
      {children}
    </div>
  );
}

interface ListItemActionsProps {
  children: ReactNode;
  className?: string;
}

function ListItemActions({ children, className }: ListItemActionsProps) {
  return (
    <div className={cn("relative flex items-center gap-4", className)} data-slot="list-item-actions">
      {children}
    </div>
  );
}

export {
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemTitle,
  ListItemTitleLink,
};
