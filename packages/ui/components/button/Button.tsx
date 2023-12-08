import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { LinkProps } from "next/link";
import Link from "next/link";
import React, { forwardRef } from "react";

import classNames from "@calcom/lib/classNames";
import type { SVGComponent } from "@calcom/types/SVGComponent";

import { Plus } from "../icon";
import { Tooltip } from "../tooltip";

type InferredVariantProps = VariantProps<typeof buttonClasses>;

export type ButtonColor = NonNullable<InferredVariantProps["color"]>;
export type ButtonBaseProps = {
  /** Action that happens when the button is clicked */
  onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  /**Left aligned icon*/
  StartIcon?: SVGComponent | React.ElementType;
  /**Right aligned icon */
  EndIcon?: SVGComponent;
  shallow?: boolean;
  /**Tool tip used when icon size is set to small */
  tooltip?: string;
  tooltipSide?: "top" | "right" | "bottom" | "left";
  tooltipOffset?: number;
  disabled?: boolean;
  flex?: boolean;
} & Omit<InferredVariantProps, "color"> & {
    color?: ButtonColor;
  };

export type ButtonProps = ButtonBaseProps &
  (
    | (Omit<JSX.IntrinsicElements["a"], "href" | "onClick" | "ref"> & LinkProps)
    | (Omit<JSX.IntrinsicElements["button"], "onClick" | "ref"> & { href?: never })
  );

export const buttonClasses = cva(
  "whitespace-nowrap inline-flex items-center text-sm font-medium relative rounded-md transition disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        button: "",
        icon: "flex justify-center",
        fab: "rounded-full justify-center md:rounded-md radix-state-open:rotate-45 md:radix-state-open:rotate-0 radix-state-open:shadown-none radix-state-open:ring-0 !shadow-none",
      },
      color: {
        primary:
          "bg-brand-default hover:bg-brand-emphasis focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset focus-visible:ring-brand-default text-brand disabled:bg-brand-subtle disabled:text-brand-subtle disabled:opacity-40 disabled:hover:bg-brand-subtle disabled:hover:text-brand-default disabled:hover:opacity-40",
        secondary:
          "text-emphasis border border-default bg-default hover:bg-muted hover:border-emphasis focus-visible:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset focus-visible:ring-empthasis disabled:border-subtle disabled:bg-opacity-30 disabled:text-muted disabled:hover:bg-opacity-30 disabled:hover:text-muted disabled:hover:border-subtle disabled:hover:bg-default",
        minimal:
          "text-emphasis hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset focus-visible:ring-empthasis disabled:border-subtle disabled:bg-opacity-30 disabled:text-muted disabled:hover:bg-transparent disabled:hover:text-muted disabled:hover:border-subtle",
        destructive:
          "border border-default text-emphasis hover:text-red-700 dark:hover:text-red-100 focus-visible:text-red-700  hover:border-red-100 focus-visible:border-red-100 hover:bg-error  focus-visible:bg-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset focus-visible:ring-red-700 disabled:bg-red-100 disabled:border-red-200 disabled:text-red-700 disabled:hover:border-red-200 disabled:opacity-40",
      },
      size: {
        sm: "px-3 py-2 leading-4 rounded-sm" /** For backwards compatibility */,
        base: "h-9 px-4 py-2.5 ",
        lg: "h-[36px] px-4 py-2.5 ",
      },
      loading: {
        true: "cursor-wait",
      },
    },
    compoundVariants: [
      // Primary variants
      {
        loading: true,
        color: "primary",
        className: "bg-brand-subtle text-brand-subtle",
      },
      // Secondary variants
      {
        loading: true,
        color: "secondary",
        className: "bg-subtle text-emphasis/80",
      },
      // Minimal variants
      {
        loading: true,
        color: "minimal",
        className: "bg-subtle text-emphasis/30",
      },
      // Destructive variants
      {
        loading: true,
        color: "destructive",
        className:
          "text-red-700/30 dark:text-red-700/30 hover:text-red-700/30  border border-default text-emphasis",
      },
      {
        variant: "icon",
        size: "base",
        className: "min-h-[36px] min-w-[36px] !p-2 hover:border-default",
      },
      {
        variant: "icon",
        size: "sm",
        className: "h-6 w-6 !p-1",
      },
      {
        variant: "fab",
        size: "base",
        className: "h-14 md:h-9 md:w-auto md:px-4 md:py-2.5",
      },
    ],
    defaultVariants: {
      variant: "button",
      color: "primary",
      size: "base",
    },
  }
);

export const Button = forwardRef<HTMLAnchorElement | HTMLButtonElement, ButtonProps>(function Button(
  props: ButtonProps,
  forwardedRef
) {
  const {
    loading = false,
    color = "primary",
    size,
    variant = "button",
    type = "button",
    tooltipSide = "top",
    tooltipOffset = 4,
    StartIcon,
    EndIcon,
    shallow,
    // attributes propagated from `HTMLAnchorProps` or `HTMLButtonProps`
    ...passThroughProps
  } = props;
  // Buttons are **always** disabled if we're in a `loading` state
  const disabled = props.disabled || loading;
  // If pass an `href`-attr is passed it's `<a>`, otherwise it's a `<button />`
  const isLink = typeof props.href !== "undefined";
  const elementType = isLink ? "a" : "button";
  const element = React.createElement(
    elementType,
    {
      ...passThroughProps,
      disabled,
      type: !isLink ? type : undefined,
      ref: forwardedRef,
      className: classNames(buttonClasses({ color, size, loading, variant }), props.className),
      // if we click a disabled button, we prevent going through the click handler
      onClick: disabled
        ? (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
            e.preventDefault();
          }
        : props.onClick,
    },
    <>
      {StartIcon && (
        <>
          {variant === "fab" ? (
            <>
              <StartIcon className="hidden h-4 w-4 stroke-[1.5px] ltr:-ml-1 ltr:mr-2 rtl:-mr-1 rtl:ml-2 md:inline-flex" />
              <Plus data-testid="plus" className="inline h-6 w-6 md:hidden" />
            </>
          ) : (
            <StartIcon
              className={classNames(
                variant === "icon" && "h-4 w-4",
                variant === "button" && "h-4 w-4 stroke-[1.5px] ltr:-ml-1 ltr:mr-2 rtl:-mr-1 rtl:ml-2"
              )}
            />
          )}
        </>
      )}
      {variant === "fab" ? <span className="hidden md:inline">{props.children}</span> : props.children}
      {loading && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
          <svg
            className={classNames(
              "mx-4 h-5 w-5 animate-spin",
              color === "primary" ? "text-inverted" : "text-emphasis"
            )}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}
      {EndIcon && (
        <>
          {variant === "fab" ? (
            <>
              <EndIcon className="-mr-1 me-2 ms-2 hidden h-5 w-5 md:inline" />
              <Plus data-testid="plus" className="inline h-6 w-6 md:hidden" />
            </>
          ) : (
            <EndIcon
              className={classNames(
                "inline-flex",
                variant === "icon" && "h-4 w-4",
                variant === "button" && "h-4 w-4 stroke-[1.5px] ltr:-mr-1 ltr:ml-2 rtl:-ml-1 rtl:mr-2"
              )}
            />
          )}
        </>
      )}
    </>
  );

  return props.href ? (
    <Link data-testid="link-component" passHref href={props.href} shallow={shallow && shallow} legacyBehavior>
      {element}
    </Link>
  ) : (
    <Wrapper
      data-testid="wrapper"
      tooltip={props.tooltip}
      tooltipSide={tooltipSide}
      tooltipOffset={tooltipOffset}>
      {element}
    </Wrapper>
  );
});

const Wrapper = ({
  children,
  tooltip,
  tooltipSide,
  tooltipOffset,
}: {
  tooltip?: string;
  children: React.ReactNode;
  tooltipSide?: "top" | "right" | "bottom" | "left";
  tooltipOffset?: number;
}) => {
  if (!tooltip) {
    return <>{children}</>;
  }

  return (
    <Tooltip data-testid="tooltip" content={tooltip} side={tooltipSide} sideOffset={tooltipOffset}>
      {children}
    </Tooltip>
  );
};
