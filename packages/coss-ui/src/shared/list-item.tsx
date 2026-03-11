"use client";

import { mergeProps } from "@coss/ui/base-ui/merge-props";
import { useRender } from "@coss/ui/base-ui/use-render";
import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import { ItemLabel } from "@coss/ui/shared/item-label";
import { GripVerticalIcon } from "lucide-react";
import React, {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

/** Event listeners for drag-and-drop (from @dnd-kit when sortable) */
interface SortableListeners {
  [key: string]: (() => void) | undefined;
}

interface ListItemProps extends useRender.ComponentProps<"div"> {
  sortable?: boolean;
  labelColorLight?: string;
  labelColorDark?: string;
  isOverlay?: boolean;
  sortableRef?: (node: HTMLElement | null) => void;
  sortableStyle?: CSSProperties;
  sortableDragging?: boolean;
  sortableDraggingAny?: boolean;
  sortableListeners?: SortableListeners;
  hasDragged?: boolean;
}

interface SortableListItemProps {
  children: ReactNode;
  className?: string;
  labelColorLight?: string;
  labelColorDark?: string;
  isOverlay?: boolean;
  sortableRef?: (node: HTMLElement | null) => void;
  sortableStyle?: CSSProperties;
  sortableDragging?: boolean;
  sortableDraggingAny?: boolean;
  sortableListeners?: SortableListeners;
  hasDragged?: boolean;
}

const spanningTriggerClasses = "cursor-pointer before:absolute before:inset-0";

type ListItemSpanningTriggerProps = Omit<ComponentPropsWithoutRef<"div">, "render"> & {
  render?: React.ReactElement;
};

export const sortableListClasses =
  "has-[[data-drag-ghost],[data-drag-release]]:border-transparent has-[[data-drag-ghost],[data-drag-release]]:bg-transparent has-[[data-drag-ghost],[data-drag-release]]:shadow-none has-[[data-drag-ghost],[data-drag-release]]:before:hidden has-[[data-drag-ghost],[data-drag-release]]:**:data-[slot=list-item]:border-transparent has-[[data-drag-ghost],[data-drag-release]]:**:data-[slot=list-item]:after:visible";

export function ListItem({
  children,
  className,
  render,
  sortable = false,
  labelColorLight,
  labelColorDark,
  isOverlay,
  sortableRef,
  sortableStyle,
  sortableDragging,
  sortableDraggingAny,
  sortableListeners,
  hasDragged,
  ...props
}: ListItemProps): ReturnType<typeof useRender> {
  const baseClasses =
    "not-last:border-b bg-clip-padding has-[[data-spanning-trigger]:hover]:z-1 has-[[data-spanning-trigger]:hover]:bg-[color-mix(in_srgb,var(--card),var(--color-black)_2%)] dark:has-[[data-spanning-trigger]:hover]:bg-[color-mix(in_srgb,var(--card),var(--color-white)_2%)] first:rounded-t-[calc(var(--radius-2xl)-1px)] last:rounded-b-[calc(var(--radius-2xl)-1px)] in-[[data-slot=card-frame]:has([data-slot=card-frame-header])]:first:rounded-t-[calc(var(--radius-xl)-1px)] in-[[data-slot=card-frame]:has([data-slot=card-frame-footer])]:last:rounded-b-[calc(var(--radius-xl)-1px)]";

  const staticClasses = "transition-[background-color]";

  const sortableClasses =
    "after:-inset-px relative translate-y-(--translate-y) data-has-dragged:starting:rounded-2xl not-data-drag-on:transition-[background-color] data-has-dragged:not-data-drag-on:transition-[background-color,border-radius] after:pointer-events-none after:invisible after:absolute data-has-dragged:starting:after:inset-y-1 data-has-dragged:starting:after:rounded-2xl first:after:rounded-t-2xl last:after:rounded-b-2xl after:border after:border-border after:bg-card after:transition-[border-radius,inset] data-drag-overlay:data-drag-release:hidden data-drag-overlay:pointer-events-none data-drag-on:not-data-drag-ghost:z-1 data-drag-on:rounded-2xl data-drag-on:transition-[translate] data-drag-on:after:visible data-drag-overlay:after:visible data-drag-on:after:inset-y-1 data-drag-overlay:after:inset-y-1 data-drag-on:after:rounded-2xl data-drag-overlay:after:rounded-2xl data-drag-ghost:after:border-dashed data-drag-ghost:after:bg-muted/24 not-dark:data-drag-overlay:after:bg-clip-padding data-drag-overlay:after:shadow-lg data-drag-ghost:*:opacity-0 before:pointer-events-none before:absolute before:inset-x-0 before:inset-y-[5px] before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)] not-data-drag-overlay:before:hidden before:z-1";

  const innerContent = (
    <div className={cn("relative flex items-center justify-between gap-4 px-6 py-4", sortable && "z-1")}>
      {sortable && <ItemLabel colorDark={labelColorDark} colorLight={labelColorLight} />}
      {children}
    </div>
  );

  const defaultProps = {
    className: cn(baseClasses, sortable ? sortableClasses : staticClasses, className),
    "data-drag-ghost": sortable && sortableDragging ? "" : undefined,
    "data-drag-on": sortable && sortableDraggingAny ? "" : undefined,
    "data-drag-overlay": sortable && isOverlay ? "" : undefined,
    "data-draggable": sortable ? "" : undefined,
    "data-has-dragged": sortable && hasDragged ? "" : undefined,
    "data-slot": "list-item",
    ref: sortable ? sortableRef : undefined,
    style: sortable ? sortableStyle : undefined,
    ...(sortable ? (sortableListeners ?? {}) : {}),
  };

  const mergedProps = mergeProps<"div">(defaultProps, props);
  const propsWithInnerContent = {
    ...mergedProps,
    children: innerContent,
  };

  return useRender({
    defaultTagName: "div",
    props: propsWithInnerContent,
    render,
  });
}

export function SortableListItem({
  children,
  className,
  labelColorLight,
  labelColorDark,
  isOverlay,
  sortableRef,
  sortableStyle,
  sortableDragging,
  sortableDraggingAny,
  sortableListeners,
  hasDragged,
}: SortableListItemProps): ReactElement {
  return (
    <ListItem
      className={className}
      hasDragged={hasDragged}
      isOverlay={isOverlay}
      labelColorDark={labelColorDark}
      labelColorLight={labelColorLight}
      sortable
      sortableDragging={sortableDragging}
      sortableDraggingAny={sortableDraggingAny}
      sortableListeners={sortableListeners}
      sortableRef={sortableRef}
      sortableStyle={sortableStyle}>
      {children}
    </ListItem>
  );
}

export function ListItemDragHandle({ className }: { className?: string }): ReactElement {
  return (
    <Button
      aria-label="Drag to reorder"
      className={cn(
        "pointer-events-auto absolute inset-y-px start-0 z-1 h-auto! cursor-grab items-start bg-transparent! pt-4.25 in-[[data-slot=list-item]_[data-spanning-trigger]:hover,[data-slot=list-item][data-drag-overlay],[data-drag-release]]:opacity-100 opacity-0 not-in-data-drag-release:transition-opacity focus:opacity-100 focus-visible:ring-0 focus-visible:ring-offset-0 active:cursor-grabbing",
        className
      )}
      data-slot="list-item-drag-handle"
      size="icon-xs"
      variant="ghost">
      <GripVerticalIcon
        aria-hidden="true"
        className="in-[[data-slot=list-item-drag-handle]:hover,[data-slot=list-item-drag-handle]:focus-visible]:opacity-100 opacity-40"
      />
    </Button>
  );
}

export function ListItemContent({
  children,
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">): ReturnType<typeof useRender> {
  const defaultProps = {
    className: cn("flex min-w-0 flex-1 flex-col gap-3", className),
    "data-slot": "list-item-content",
  };
  const mergedProps = mergeProps<"div">(defaultProps, props);
  const propsWithChildren = { ...mergedProps, children };
  return useRender({
    defaultTagName: "div",
    props: propsWithChildren,
    render,
  });
}

export function ListItemHeader({
  children,
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">): ReturnType<typeof useRender> {
  const defaultProps = {
    className: cn("flex flex-col gap-1", className),
    "data-slot": "list-item-header",
  };
  const mergedProps = mergeProps<"div">(defaultProps, props);
  const propsWithChildren = { ...mergedProps, children };
  return useRender({
    defaultTagName: "div",
    props: propsWithChildren,
    render,
  });
}

export function ListItemTitle({
  children,
  className,
  render,
  ...props
}: useRender.ComponentProps<"h2">): ReturnType<typeof useRender> {
  const defaultProps = {
    className: cn("font-semibold sm:text-sm", className),
    "data-slot": "list-item-title",
  };
  const mergedProps = mergeProps<"h2">(defaultProps, props);
  const propsWithChildren = { ...mergedProps, children };
  return useRender({
    defaultTagName: "h2",
    props: propsWithChildren,
    render,
  });
}

export function ListItemSpanningTrigger({
  children,
  className,
  render,
  ...props
}: ListItemSpanningTriggerProps): ReactElement {
  const mergedProps = {
    className: cn(spanningTriggerClasses, className),
    "data-spanning-trigger": "",
    ...props,
  };

  if (render) {
    const renderProps = (render.props || {}) as Record<string, unknown>;
    const merged = {
      ...renderProps,
      ...mergedProps,
      children: children ?? renderProps.children,
      className: cn(renderProps.className as string, spanningTriggerClasses, className),
    };
    return React.cloneElement(render, merged as React.Attributes);
  }

  return <div {...mergedProps}>{children}</div>;
}

export function ListItemDescription({
  children,
  className,
  render,
  ...props
}: useRender.ComponentProps<"p">): ReturnType<typeof useRender> {
  const defaultProps = {
    className: cn("text-muted-foreground text-sm", className),
    "data-slot": "list-item-description",
  };
  const mergedProps = mergeProps<"p">(defaultProps, props);
  const propsWithChildren = { ...mergedProps, children };
  return useRender({
    defaultTagName: "p",
    props: propsWithChildren,
    render,
  });
}

export function ListItemBadges({
  children,
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">): ReturnType<typeof useRender> {
  const defaultProps = {
    className: cn("flex flex-wrap items-center gap-2", className),
    "data-slot": "list-item-badges",
  };
  const mergedProps = mergeProps<"div">(defaultProps, props);
  const propsWithChildren = { ...mergedProps, children };
  return useRender({
    defaultTagName: "div",
    props: propsWithChildren,
    render,
  });
}

export function ListItemActions({
  children,
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">): ReturnType<typeof useRender> {
  const defaultProps = {
    className: cn("relative flex items-center gap-4", className),
    "data-slot": "list-item-actions",
  };
  const mergedProps = mergeProps<"div">(defaultProps, props);
  const propsWithChildren = { ...mergedProps, children };
  return useRender({
    defaultTagName: "div",
    props: propsWithChildren,
    render,
  });
}
