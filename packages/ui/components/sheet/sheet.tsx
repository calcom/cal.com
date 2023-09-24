import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import classNames from "@calcom/lib/classNames";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const portalVariants = cva("fixed inset-0 z-50 flex", {
  variants: {
    position: {
      top: "items-start",
      bottom: "items-end",
      left: "justify-start",
      right: "justify-end",
    },
  },
  defaultVariants: { position: "right" },
});

interface SheetPortalProps extends SheetPrimitive.DialogPortalProps, VariantProps<typeof portalVariants> {}

const SheetPortal = ({ position, className, children, ...props }: SheetPortalProps) => (
  <SheetPrimitive.Portal className={classNames(className)} {...props}>
    <div className={portalVariants({ position })}>{children}</div>
  </SheetPrimitive.Portal>
);
SheetPortal.displayName = SheetPrimitive.Portal.displayName;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
>(({ className, children, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={classNames(
      "data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in fixed inset-0 z-50 bg-neutral-800 bg-opacity-70 backdrop-blur-[1px] transition-all duration-100",
      className
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 scale-100 gap-4 bg-default m-4 rounded-xl p-6 opacity-100 shadow-lg border border-default flex flex-col ",
  {
    variants: {
      position: {
        top: "animate-in slide-in-from-top w-full duration-200",
        bottom: "animate-in slide-in-from-bottom w-full duration-200",
        left: "animate-in slide-in-from-left h-full duration-200",
        right: "animate-in slide-in-from-right h-full duration-200",
      },
      size: {
        content: "",
        default: "",
        sm: "",
        lg: "",
        xl: "",
        full: "",
      },
    },
    compoundVariants: [
      {
        position: ["top", "bottom"],
        size: "content",
        class: "max-h-screen",
      },
      {
        position: ["top", "bottom"],
        size: "default",
        class: "h-1/3",
      },
      {
        position: ["top", "bottom"],
        size: "sm",
        class: "h-1/4",
      },
      {
        position: ["top", "bottom"],
        size: "lg",
        class: "h-1/2",
      },
      {
        position: ["top", "bottom"],
        size: "xl",
        class: "h-5/6",
      },
      {
        position: ["top", "bottom"],
        size: "full",
        class: "h-screen",
      },
      {
        position: ["right", "left"],
        size: "content",
        class: "max-w-screen",
      },
      {
        position: ["right", "left"],
        size: "default",
        class: "w-[calc(100%-2rem)] lg:w-1/3 max-h-[calc(100vh-2rem)]",
      },
      {
        position: ["right", "left"],
        size: "sm",
        class: "w-1/4 max-h-[calc(100vh-2rem)]",
      },
      {
        position: ["right", "left"],
        size: "lg",
        class: "w-1/2 h-[calc(100vh-2rem)]",
      },
      {
        position: ["right", "left"],
        size: "xl",
        class: "w-5/6 h-[calc(100vh-2rem)]",
      },
      {
        position: ["right", "left"],
        size: "full",
        class: "w-screen h-[calc(100vh-2rem)]",
      },
    ],
    defaultVariants: {
      position: "right",
      size: "default",
    },
  }
);

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  bottomActions?: React.ReactNode;
}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, DialogContentProps>(
  ({ position, size, className, children, bottomActions, ...props }, ref) => (
    <SheetPortal position={position}>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        {...props}
        className={classNames(sheetVariants({ position, size }), className)}>
        <div className="no-scrollbar h-full overflow-y-auto">{children}</div>
        {bottomActions && (
          <div className="mt-auto flex justify-end">
            <div className="flex gap-2">{bottomActions}</div>
          </div>
        )}
        <SheetPrimitive.Close className="focus:ring-emphasis data-[state=open]:bg-deafult absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={classNames("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={classNames("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={classNames("text-foreground text-lg font-semibold", className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={classNames("text-muted-foreground text-sm", className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
