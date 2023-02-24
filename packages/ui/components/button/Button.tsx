import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { LinkProps } from "next/link";
import Link from "next/link";
import React, { forwardRef } from "react";

import classNames from "@calcom/lib/classNames";
import { applyStyleToMultipleVariants } from "@calcom/lib/cva";
import type { SVGComponent } from "@calcom/types/SVGComponent";

import { FiPlus } from "../icon";
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
  flex?: boolean;
} & Omit<InferredVariantProps, "color"> & {
    color?: ButtonColor;
  };

export type ButtonProps = ButtonBaseProps &
  (
    | (Omit<JSX.IntrinsicElements["a"], "href" | "onClick" | "ref"> & LinkProps)
    | (Omit<JSX.IntrinsicElements["button"], "onClick" | "ref"> & { href?: never })
  );

const buttonClasses = cva(
  "inline-flex items-center text-sm font-medium relative rounded-md transition-colors",
  {
    variants: {
      variant: {
        button: "",
        icon: "flex justify-center",
        fab: "rounded-full justify-center md:rounded-md radix-state-open:rotate-45 md:radix-state-open:rotate-0 transition-transform radix-state-open:shadown-none radix-state-open:ring-0 !shadow-none",
      },
      color: {
        primary: "text-white dark:text-black",
        secondary: "text-gray-900 dark:text-darkgray-900",
        minimal: "text-gray-900 dark:text-darkgray-900",
        destructive: "",
      },
      size: {
        sm: "px-3 py-2 leading-4 rounded-sm" /** For backwards compatibility */,
        base: "h-9 px-4 py-2.5 ",
        lg: "h-[36px] px-4 py-2.5 ",
      },
      loading: {
        true: "cursor-wait",
      },
      disabled: {
        true: "cursor-not-allowed",
      },
    },
    compoundVariants: [
      // Primary variants
      {
        disabled: true,
        color: "primary",
        className: "bg-gray-800 bg-opacity-30 dark:bg-opacity-30 dark:bg-darkgray-800",
      },
      {
        loading: true,
        color: "primary",
        className: "bg-gray-800/30 text-white/30 dark:bg-opacity-30 dark:bg-darkgray-700 dark:text-black/30",
      },
      ...applyStyleToMultipleVariants({
        disabled: [undefined, false],
        color: "primary",
        className:
          "bg-brand-500 hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset focus-visible:ring-brand-500 dark:hover:bg-darkgray-600 dark:bg-darkgray-900",
      }),
      // Secondary variants
      {
        disabled: true,
        color: "secondary",
        className:
          "border border-gray-200 bg-opacity-30 text-gray-900/30 dark:text-darkgray-900/30 dark:border-darkgray-200",
      },
      {
        loading: true,
        color: "secondary",
        className:
          "bg-gray-100 text-gray-900/30 dark:bg-darkgray-100 dark:text-darkgray-900/30 dark:border-darkgray-200",
      },
      ...applyStyleToMultipleVariants({
        disabled: [undefined, false],
        color: "secondary",
        className:
          "border border-gray-300 dark:border-darkgray-300 bg-white dark:bg-darkgray-100 hover:bg-gray-50 hover:border-gray-400 focus-visible:bg-gray-100 dark:hover:bg-darkgray-200 dark:focus-visible:bg-darkgray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset focus-visible:ring-gray-900 dark:focus-visible:ring-white",
      }),
      // Minimal variants
      {
        disabled: true,
        color: "minimal",
        className:
          "border:gray-200 bg-opacity-30 text-gray-900/30 dark:bg-darkgray-100 dark:text-darkgray-900/30 dark:border-darkgray-200",
      },
      {
        loading: true,
        color: "minimal",
        className:
          "bg-gray-100 text-gray-900/30 dark:bg-darkgray-100 dark:text-darkgray-900/30 dark:border-darkgray-200",
      },
      ...applyStyleToMultipleVariants({
        disabled: [undefined, false],
        color: "minimal",
        className:
          "hover:bg-gray-100 focus-visible:bg-gray-100 dark:hover:bg-darkgray-200 dark:focus-visible:bg-darkgray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset focus-visible:ring-gray-900 dark:focus-visible:ring-white",
      }),
      // Destructive variants
      {
        disabled: true,
        color: "destructive",
        className:
          "text-red-700/30 dark:text-red-700/30 bg-red-100/40 dark:bg-red-100/80 border border-red-200",
      },
      {
        loading: true,
        color: "destructive",
        className:
          "text-red-700/30 dark:text-red-700/30 hover:text-red-700/30 bg-red-100 border border-red-200",
      },
      ...applyStyleToMultipleVariants({
        disabled: [false, undefined],
        color: "destructive",
        className:
          "border dark:text-white text-gray-900 hover:text-red-700 focus-visible:text-red-700 dark:hover:text-red-700 dark:focus-visible:text-red-700 hover:border-red-100 focus-visible:border-red-100 hover:bg-red-100  focus-visible:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset focus-visible:ring-red-700",
      }),
      // https://github.com/joe-bell/cva/issues/95 created an issue about using !p-2 on the icon variants as i would expect this to take priority
      {
        variant: "icon",
        size: "base",
        className: "min-h-[36px] min-w-[36px] !p-2",
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
      className: classNames(
        buttonClasses({ color, size, loading, disabled: props.disabled, variant }),
        props.className
      ),
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
              <StartIcon className="hidden h-4 w-4 stroke-[1.5px] ltr:mr-2 rtl:ml-2 md:inline-flex" />
              <FiPlus className="inline h-6 w-6 md:hidden" />
            </>
          ) : (
            <StartIcon
              className={classNames(
                variant === "icon" && "h-4 w-4",
                variant === "button" && "h-4 w-4 stroke-[1.5px] ltr:mr-2 rtl:ml-2"
              )}
            />
          )}
        </>
      )}
      {variant === "fab" ? <span className="hidden md:inline">{props.children}</span> : props.children}
      {loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform">
          <svg
            className={classNames(
              "mx-4 h-5 w-5 animate-spin",
              color === "primary" ? "text-white dark:text-black" : "text-black dark:text-white"
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
              <EndIcon className="-mr-1 hidden h-5 w-5 ltr:ml-2 rtl:-ml-1 rtl:mr-2 md:inline" />
              <FiPlus className="inline h-6 w-6 md:hidden" />
            </>
          ) : (
            <EndIcon
              className={classNames(
                "inline-flex",
                variant === "icon" && "h-4 w-4",
                variant === "button" && "h-4 w-4 stroke-[1.5px] ltr:ml-2 rtl:mr-2"
              )}
            />
          )}
        </>
      )}
    </>
  );

  return props.href ? (
    <Link passHref href={props.href} shallow={shallow && shallow} legacyBehavior>
      {element}
    </Link>
  ) : (
    <Wrapper tooltip={props.tooltip}>{element}</Wrapper>
  );
});

const Wrapper = ({ children, tooltip }: { tooltip?: string; children: React.ReactNode }) => {
  if (!tooltip) {
    return <>{children}</>;
  }

  return <Tooltip content={tooltip}>{children}</Tooltip>;
};
