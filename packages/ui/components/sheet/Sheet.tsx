"use client";

import classNames from "@calcom/ui/classNames";
import * as SheetPrimitives from "@radix-ui/react-dialog";
import * as React from "react";
import { Button } from "../button";

const Sheet = (props: React.ComponentPropsWithoutRef<typeof SheetPrimitives.Root>) => {
  return <SheetPrimitives.Root {...props} />;
};
Sheet.displayName = "Sheet";

const SheetTrigger = React.forwardRef<
  React.ElementRef<typeof SheetPrimitives.Trigger>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitives.Trigger>
>(({ className, ...props }, ref) => {
  return <SheetPrimitives.Trigger ref={ref} className={classNames(className)} {...props} />;
});
SheetTrigger.displayName = "Sheet.Trigger";

const SheetClose = React.forwardRef<
  React.ElementRef<typeof SheetPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitives.Close>
>(({ className, ...props }, ref) => {
  return <SheetPrimitives.Close ref={ref} className={classNames(className)} {...props} />;
});
SheetClose.displayName = "Sheet.Close";

const SheetPortal = SheetPrimitives.Portal;

SheetPortal.displayName = "SheetPortal";

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitives.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitives.Overlay>
>(({ className, ...props }, forwardedRef) => {
  return (
    <SheetPrimitives.Overlay
      ref={forwardedRef}
      className={classNames(
        // base
        "fixed inset-0 z-50 overflow-y-auto",
        // background color
        "bg-black/30",
        // transition
        "data-[state=closed]:animate-hide data-[state=open]:animate-dialogOverlayShow",
        className
      )}
      {...props}
      style={{
        animationDuration: "400ms",
        animationFillMode: "backwards",
      }}
    />
  );
});

SheetOverlay.displayName = "SheetOverlay";

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitives.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitives.Content> & {
    hideOverlay?: boolean;
  }
>(({ className, hideOverlay = false, ...props }, forwardedRef) => {
  const content = (
    <SheetPrimitives.Content
      ref={forwardedRef}
      className={classNames(
        // base
        "fixed inset-x-0 inset-y-4 mx-auto flex w-[95vw] flex-1 flex-col overflow-y-auto rounded-xl border p-4 shadow-lg focus:outline-none sm:inset-x-auto sm:right-2 sm:max-w-lg sm:p-6",
        // "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm sm:p-6 p-4 shadow-lg rounded-xl border ",
        // border color
        "border-subtle",
        // background color
        "bg-default",
        // transition
        "data-[state=closed]:animate-SheetSlideRightAndFade data-[state=open]:animate-SheetSlideLeftAndFade",
        // Increase z-index when no overlay to ensure it's above other content
        hideOverlay && "z-50",
        className
      )}
      {...props}
    />
  );

  return <SheetPortal>{hideOverlay ? content : <SheetOverlay>{content}</SheetOverlay>}</SheetPortal>;
});

SheetContent.displayName = "SheetContent";

const SheetHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & { showCloseButton?: boolean }
>(({ children, className, showCloseButton = true, ...props }, ref) => {
  return (
    <div ref={ref} className="flex items-start justify-between gap-x-4 pb-2" {...props}>
      <div className={classNames("mt-1 flex flex-col gap-y-1", className)}>{children}</div>
      {showCloseButton && (
        <SheetPrimitives.Close asChild>
          <Button variant="icon" StartIcon="x" color="minimal" className="aspect-square p-1" />
        </SheetPrimitives.Close>
      )}
    </div>
  );
});

SheetHeader.displayName = "Sheet.Header";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitives.Title>
>(({ className, ...props }, forwardedRef) => (
  <SheetPrimitives.Title
    ref={forwardedRef}
    className={classNames(
      // base
      "font-sans text-xl font-semibold",
      // text color
      "text-emphasis",
      className
    )}
    {...props}
  />
));

SheetTitle.displayName = "SheetTitle";

const SheetBody = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={classNames("flex-1 overflow-y-auto py-4", className)} {...props} />;
  }
);

SheetBody.displayName = "Sheet.Body";

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitives.Description>
>(({ className, ...props }, forwardedRef) => {
  return (
    <SheetPrimitives.Description
      ref={forwardedRef}
      className={classNames("text-subtle text-sm leading-none", className)}
      {...props}
    />
  );
});

SheetDescription.displayName = "SheetDescription";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={classNames(
        "border-muted flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
};

SheetFooter.displayName = "SheetFooter";

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
