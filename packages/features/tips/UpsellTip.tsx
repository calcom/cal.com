"use client";

import { Alert, AlertTitle, AlertDescription, AlertAction } from "@coss/ui/components/alert";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  CardContent,
} from "@coss/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@coss/ui/components/dialog";
import { cn } from "@coss/ui/lib/utils";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface UpsellTipProps {
  title: string;
  description: string;
  actions?: ReactNode;
  /** Optional icon or illustration */
  icon?: ReactNode;
  /** Optional image URL or component */
  image?: string | ReactNode;
  /** Callback when the user dismisses the tip */
  onDismiss?: () => void;
  className?: string;
  children?: ReactNode;
}

// -----------------------------------------------------------------------------
// Variant: Card
// -----------------------------------------------------------------------------

export function UpsellCard({
  title,
  description,
  actions,
  icon,
  image,
  onDismiss,
  className,
  children,
}: UpsellTipProps) {
  if (onDismiss) {
    // Wrap in relative container to position close button if needed
    // However, Card component structure might need adjustment.
    // We'll place a close button absolute top-right.
  }

  return (
    <Card className={cn("overflow-hidden", image && "py-0 pb-6", className)}>
      {image && (
        <div className="bg-muted h-40 w-full overflow-hidden">
          {typeof image === "string" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={title} className="h-full w-full object-cover" />
          ) : (
            image
          )}
        </div>
      )}

      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground absolute top-2 right-2 z-10"
          onClick={onDismiss}>
          <X className="h-4 w-4" />
        </Button>
      )}

      <CardHeader>
        <div className="flex items-center">
          {icon && <div className="text-primary">{icon}</div>}
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      {children && <CardContent>{children}</CardContent>}

      {actions && <CardFooter className="flex justify-end gap-2">{actions}</CardFooter>}
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Variant: Banner
// -----------------------------------------------------------------------------

export function UpsellBanner({
  title,
  description,
  actions,
  icon,
  image,
  onDismiss,
  className,
  children,
}: UpsellTipProps) {
  return (
    <div
      className={cn(
        "bg-muted/40 relative flex w-full flex-col gap-6 overflow-hidden rounded-xl border p-6 sm:flex-row sm:items-center",
        className
      )}>
      {/* Background Pattern - subtle dots */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true">
        <defs>
          <pattern id="upsell-banner-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="currentColor" className="text-muted-foreground" opacity="0.2" />
          </pattern>
          <linearGradient id="upsell-banner-fade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="1" />
          </linearGradient>
          <mask id="upsell-banner-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="url(#upsell-banner-fade)" />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#upsell-banner-dots)"
          mask="url(#upsell-banner-mask)"
        />
      </svg>

      <div className="relative z-10 flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {icon && <div className="text-primary">{icon}</div>}
            <h3 className="text-foreground text-lg font-semibold leading-tight">{title}</h3>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>

        <div className="flex items-center gap-2">{actions}</div>
      </div>

      {(image || children) && (
        <div className="relative z-10 shrink-0 sm:w-1/3 lg:w-1/4">
          {image ? (
            typeof image === "string" ? (
              <img src={image} alt={title} className="rounded-lg object-cover shadow-sm" />
            ) : (
              image
            )
          ) : (
            children
          )}
        </div>
      )}

      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground/70 hover:text-foreground absolute right-2 top-2 z-10 h-8 w-8"
          onClick={onDismiss}
          aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Variant: Inline Alert
// Based on CompanyEmailOrganizationBanner
// -----------------------------------------------------------------------------

export function UpsellInlineAlert({
  title,
  description,
  actions,
  icon,
  onDismiss,
  className,
}: UpsellTipProps) {
  return (
    <div
      className={cn(
        "border-subtle from-muted relative overflow-hidden rounded-lg border bg-gradient-to-r to-transparent p-4",
        className
      )}>
      {/* Dot grid background with fade */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true">
        <defs>
          <pattern id="upsell-dot-pattern" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="currentColor" className="text-subtle" opacity="0.3" />
          </pattern>
          <linearGradient id="upsell-fade-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="10%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="upsell-fade-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="url(#upsell-fade-gradient)" />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#upsell-dot-pattern)"
          mask="url(#upsell-fade-mask)"
        />
      </svg>

      <div className="relative z-10 flex gap-4">
        {icon && <div className="shrink-0">{icon}</div>}

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-col">
            <h3 className="text-default text-sm font-semibold">{title}</h3>
            <p className="text-default text-sm">{description}</p>
          </div>

          {actions && <div className="mt-2 flex gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Variant: Dialog
// -----------------------------------------------------------------------------

export function UpsellDialog({
  title,
  description,
  actions,
  icon,
  image,
  isOpen,
  onOpenChange,
  children,
}: UpsellTipProps & { isOpen?: boolean; onOpenChange?: (open: boolean) => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          {image && (
            <div className="bg-muted mb-4 h-40 w-full overflow-hidden rounded-lg">
              {typeof image === "string" ? (
                <img src={image} alt="" className="h-full w-full object-cover" />
              ) : (
                image
              )}
            </div>
          )}
          <div className="flex items-start gap-4">
            {icon && <div className="text-primary mt-1">{icon}</div>}
            <div className="space-y-1.5">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {children && <div className="px-6 pb-6">{children}</div>}

        {actions && <DialogFooter>{actions}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Variant: Sidebar Widget
// Small card often used in sidebars
// -----------------------------------------------------------------------------

export function UpsellSidebar({ title, description, actions, image, onDismiss, className }: UpsellTipProps) {
  // Sidebar widgets are usually compact.
  return (
    <div
      className={cn(
        "bg-card text-card-foreground group relative flex flex-col overflow-hidden rounded-xl border shadow-sm",
        className
      )}>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="bg-background/50 absolute top-2 right-2 z-10 opacity-70 backdrop-blur-sm hover:opacity-100"
          onClick={onDismiss}>
          <X className="h-3 w-3" />
        </Button>
      )}

      {image && (
        <div className="bg-muted relative h-24 w-full">
          {/* Subtle pattern overlay could go here similar to inline alert */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "8px 8px",
            }}
          />

          {typeof image === "string" ? (
            <img
              src={image}
              alt=""
              className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
            />
          ) : (
            image
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 p-4">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold leading-tight">{title}</h4>
          <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
        </div>

        {actions && <div className="flex flex-col gap-2">{actions}</div>}
      </div>
    </div>
  );
}
