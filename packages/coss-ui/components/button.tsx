import * as React from "react"
import { mergeProps } from "@base-ui-components/react/merge-props"
import { useRender } from "@base-ui-components/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@coss/ui/lib/utils"

const buttonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-clip-padding text-sm font-medium whitespace-nowrap transition-shadow outline-none before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground shadow-xs shadow-primary/24 not-disabled:inset-shadow-[0_1px_--theme(--color-white/16%)] hover:bg-primary/90 [&:is(:active,[data-pressed])]:inset-shadow-[0_1px_--theme(--color-black/8%)] [&:is(:disabled,:active,[data-pressed])]:shadow-none",
        outline:
          "border-border bg-background shadow-xs not-disabled:not-active:not-data-pressed:before:shadow-[0_1px_--theme(--color-black/4%)] dark:bg-input/32 dark:not-in-data-[slot=group]:bg-clip-border dark:not-disabled:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/4%)] dark:not-disabled:not-active:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/8%)] [&:is(:disabled,:active,[data-pressed])]:shadow-none [&:is(:hover,[data-pressed])]:bg-accent/50 dark:[&:is(:hover,[data-pressed])]:bg-input/64",
        secondary:
          "border-secondary bg-secondary text-secondary-foreground hover:bg-secondary/90 data-pressed:bg-secondary/90",
        destructive:
          "border-destructive bg-destructive text-white shadow-xs shadow-destructive/24 not-disabled:inset-shadow-[0_1px_--theme(--color-white/16%)] hover:bg-destructive/90 [&:is(:active,[data-pressed])]:inset-shadow-[0_1px_--theme(--color-black/8%)] [&:is(:disabled,:active,[data-pressed])]:shadow-none",
        "destructive-outline":
          "border-border bg-transparent text-destructive-foreground shadow-xs not-disabled:not-active:not-data-pressed:before:shadow-[0_1px_--theme(--color-black/4%)] dark:bg-input/32 dark:not-in-data-[slot=group]:bg-clip-border dark:not-disabled:before:shadow-[0_-1px_--theme(--color-white/4%)] dark:not-disabled:not-active:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/8%)] [&:is(:disabled,:active,[data-pressed])]:shadow-none [&:is(:hover,[data-pressed])]:border-destructive/32 [&:is(:hover,[data-pressed])]:bg-destructive/4",
        ghost: "border-transparent hover:bg-accent data-pressed:bg-accent",
        link: "border-transparent underline-offset-4 hover:underline",
      },
      size: {
        default:
          "min-h-8 px-[calc(--spacing(3)-1px)] py-[calc(--spacing(1.5)-1px)]",
        xs: "min-h-6 gap-1 rounded-md px-[calc(--spacing(2)-1px)] py-[calc(--spacing(1)-1px)] text-xs before:rounded-[calc(var(--radius-md)-1px)] [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-7 gap-1.5 px-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(1)-1px)]",
        lg: "min-h-9 px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2)-1px)]",
        xl: "min-h-10 px-[calc(--spacing(4)-1px)] py-[calc(--spacing(2)-1px)] text-base [&_svg:not([class*='size-'])]:size-4.5",
        icon: "size-8",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps extends useRender.ComponentProps<"button"> {
  variant?: VariantProps<typeof buttonVariants>["variant"]
  size?: VariantProps<typeof buttonVariants>["size"]
}

function Button({ className, variant, size, render, ...props }: ButtonProps) {
  const typeValue: React.ButtonHTMLAttributes<HTMLButtonElement>["type"] =
    render ? undefined : "button"

  const defaultProps = {
    "data-slot": "button",
    className: cn(buttonVariants({ variant, size, className })),
    type: typeValue,
  }

  return useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"button">(defaultProps, props),
  })
}

export { Button, buttonVariants }