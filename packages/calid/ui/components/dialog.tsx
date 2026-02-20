import { cn } from "@calid/features/lib/cn";
import { Button } from "@calid/features/ui/components/button";
import { Icon, type IconName } from "@calid/features/ui/components/icon";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

interface DialogCloseProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close> {
  children?: React.ReactNode;
  color?: React.ComponentProps<typeof Button>["color"];
}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ className, children, color = "secondary", ...props }, ref) => {
    const { t } = useLocale();

    return (
      <DialogPrimitive.Close asChild {...props}>
        <Button StartIcon="x" ref={ref} color={color} className={className}>
          {children ?? t("cancel")}
        </Button>
      </DialogPrimitive.Close>
    );
  }
);
DialogClose.displayName = DialogPrimitive.Close.displayName;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const dialogContentVariants = cva(
  "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border border-border/50 bg-default shadow-2xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-xl",
  {
    variants: {
      size: {
        sm: "max-w-sm p-5",
        default: "w-[95vw] sm:max-w-lg p-6",
        md: "w-[95vw] sm:max-w-2xl p-6",
        lg: "w-[95vw] sm:max-w-4xl p-8",
        xl: "w-[95vw] sm:max-w-6xl p-8",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  showCloseButton?: boolean;
  forceOverlayWhenNoModal?: boolean;
  /**
   * Use this prop when content inside DialogContent could overflow and require a scrollbar.
   */
  enableOverflow?: boolean;
}

const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  (
    {
      className,
      children,
      size,
      showCloseButton = false,
      forceOverlayWhenNoModal,
      enableOverflow = false,
      ...props
    },
    ref
  ) => (
    <DialogPortal>
      {forceOverlayWhenNoModal ? (
        <div className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 pointer-events-none fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
      ) : (
        <DialogOverlay />
      )}

      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          dialogContentVariants({ size }),
          "max-h-[95vh]",
          enableOverflow ? "overflow-y-auto" : "overflow-visible",
          className
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
        {...props}>
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className="ring-offset-background hover:bg-muted focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute right-4 top-4 rounded-full p-1.5 opacity-70 transition-all hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none">
            <Icon name="x" className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

type IconVariant = "warning" | "info" | "success";

const iconVariantMap: Record<
  IconVariant,
  {
    bgColor: string;
    iconColor: string;
  }
> = {
  warning: {
    bgColor: "bg-red-100 dark:bg-red-900/20",
    iconColor: "text-red-600 dark:text-red-400",
  },
  info: {
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  success: {
    bgColor: "bg-green-100 dark:bg-green-900/20",
    iconColor: "text-green-600 dark:text-green-400",
  },
};

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  showIcon?: boolean;
  iconName?: IconName;
  iconVariant?: IconVariant;
}

const DialogHeader = ({
  className,
  showIcon = false,
  iconName,
  iconVariant,
  children,
  ...props
}: DialogHeaderProps) => {
  const iconConfig = iconVariant ? iconVariantMap[iconVariant] : null;
  const shouldShowIcon = showIcon && iconName && iconConfig;

  if (shouldShowIcon) {
    return (
      <div className={cn("flex flex-row items-start gap-3", className)} {...props}>
        <div
          className={cn(
            "border-default flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border sm:h-10 sm:w-10",
            iconConfig.bgColor
          )}>
          <Icon name={iconName} className={cn("h-5 w-5", iconConfig.iconColor)} />
        </div>
        <div className={cn("flex w-full flex-col space-y-1 text-left sm:w-auto")}>{children}</div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col space-y-1 text-left", className)} {...props}>
      {children}
    </div>
  );
};
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-6 flex flex-row justify-end gap-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-default text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-subtle text-sm", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
