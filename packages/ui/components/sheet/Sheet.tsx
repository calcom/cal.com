import * as SheetPrimitives from "@radix-ui/react-dialog";
import * as React from "react";

import classNames from "@calcom/ui/classNames";

import { Button } from "../button";

const Sheet = (props: React.ComponentPropsWithoutRef<typeof SheetPrimitives.Root>) => {
  return <SheetPrimitives.Root {...props} />;
};
Sheet.displayName = "Sheet";

const SheetTrigger = function SheetTrigger({
  ref: forwardedRef,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitives.Trigger> & {
  ref: React.RefObject<React.ElementRef<typeof SheetPrimitives.Trigger>>;
}) {
  return <SheetPrimitives.Trigger ref={forwardedRef} className={classNames(className)} {...props} />;
};
SheetTrigger.displayName = "Sheet.Trigger";

const SheetClose = function SheetClose({
  ref: forwardedRef,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitives.Close> & {
  ref: React.RefObject<React.ElementRef<typeof SheetPrimitives.Close>>;
}) {
  return <SheetPrimitives.Close ref={forwardedRef} className={classNames(className)} {...props} />;
};
SheetClose.displayName = "Sheet.Close";

const SheetPortal = SheetPrimitives.Portal;

SheetPortal.displayName = "SheetPortal";

const SheetOverlay = function SheetOverlay({
  ref: forwardedRef,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitives.Overlay> & {
  ref: React.RefObject<React.ElementRef<typeof SheetPrimitives.Overlay>>;
}) {
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
};

SheetOverlay.displayName = "SheetOverlay";

const SheetContent = function SheetContent({
  ref: forwardedRef,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitives.Content> & {
  ref: React.RefObject<React.ElementRef<typeof SheetPrimitives.Content>>;
}) {
  return (
    <SheetPortal>
      <SheetOverlay>
        <SheetPrimitives.Content
          ref={forwardedRef}
          className={classNames(
            // base
            "fixed inset-y-4 mx-auto flex w-[95vw] flex-1 flex-col overflow-y-auto rounded-xl border p-4 shadow-lg focus:outline-none sm:right-2 sm:max-w-lg sm:p-6",
            // "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm sm:p-6 p-4 shadow-lg rounded-xl border ",
            // border color
            "border-subtle",
            // background color
            "bg-default",
            // transition
            "data-[state=closed]:animate-SheetSlideRightAndFade data-[state=open]:animate-SheetSlideLeftAndFade",
            className
          )}
          {...props}
        />
      </SheetOverlay>
    </SheetPortal>
  );
};

SheetContent.displayName = "SheetContent";

const SheetHeader = function SheetHeader({
  ref: forwardedRef,
  children,
  className,
  showCloseButton = true,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { showCloseButton?: boolean } & {
  ref: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div ref={forwardedRef} className="flex items-start justify-between gap-x-4 pb-2" {...props}>
      <div className={classNames("mt-1 flex flex-col gap-y-1", className)}>{children}</div>
      {showCloseButton && (
        <SheetPrimitives.Close asChild>
          <Button variant="icon" StartIcon="x" color="minimal" className="aspect-square p-1" />
        </SheetPrimitives.Close>
      )}
    </div>
  );
};

SheetHeader.displayName = "Sheet.Header";

const SheetTitle = function SheetTitle({
  ref: forwardedRef,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitives.Title> & {
  ref: React.RefObject<React.ElementRef<typeof SheetPrimitives.Title>>;
}) {
  return (
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
  );
};

SheetTitle.displayName = "SheetTitle";

const SheetBody = function SheetBody({
  ref: forwardedRef,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  ref: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div ref={forwardedRef} className={classNames("flex-1 overflow-y-auto py-4", className)} {...props} />
  );
};

SheetBody.displayName = "Sheet.Body";

const SheetDescription = function SheetDescription({
  ref: forwardedRef,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitives.Description> & {
  ref: React.RefObject<React.ElementRef<typeof SheetPrimitives.Description>>;
}) {
  return (
    <SheetPrimitives.Description
      ref={forwardedRef}
      className={classNames("text-subtle text-sm leading-none", className)}
      {...props}
    />
  );
};

SheetDescription.displayName = "SheetDescription";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={classNames(
        "border-muted x flex flex-col-reverse border-t pt-4 sm:flex-row sm:justify-end sm:space-x-2",
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
