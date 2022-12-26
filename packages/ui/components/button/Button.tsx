import { cva, VariantProps } from "class-variance-authority";
import Link, { LinkProps } from "next/link";
import React, { forwardRef } from "react";

import classNames from "@calcom/lib/classNames";
import { applyStyleToMultipleVariants } from "@calcom/lib/cva";
import { SVGComponent } from "@calcom/types/SVGComponent";
import { Tooltip } from "@calcom/ui";
import { Icon } from "@calcom/ui";

type InferredVariantProps = VariantProps<typeof buttonClasses>;

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
    color?: NonNullable<InferredVariantProps["color"]>;
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
        icon: "flex justify-center min-h-[36px] min-w-[36px] ",
        // fab = floating action button, used for the main action in a page.
        // it uses the same primary classNames for desktop size
        fab: "h-14 w-14 sm:h-9 sm:w-auto rounded-full justify-center sm:rounded-md sm:px-4 sm:py-2.5 radix-state-open:rotate-45 sm:radix-state-open:rotate-0 transition-transform radix-state-open:shadown-none radix-state-open:ring-0 !shadow-none",
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
          "bg-brand-500 hover:bg-brand-400 focus:border focus:border-white focus:outline-none focus:ring-2 focus:ring-offset focus:ring-brand-500 dark:hover:bg-darkgray-600 dark:bg-darkgray-900",
      }),
      // Secondary variants
      {
        disabled: true,
        color: "secondary",
        className:
          "border border-gray-200 bg-opacity-30 text-gray-900/30 bg-white dark:bg-darkgray-100 dark:text-darkgray-900/30 dark:border-darkgray-200",
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
          "border border-gray-300 dark:border-darkgray-300 hover:bg-gray-50 hover:border-gray-400 focus:bg-gray-100 dark:hover:bg-darkgray-200 dark:focus:bg-darkgray-200 focus:outline-none focus:ring-2 focus:ring-offset focus:ring-gray-900 dark:focus:ring-white",
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
          "hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-darkgray-200 dark:focus:bg-darkgray-200 focus:outline-none focus:ring-2 focus:ring-offset focus:ring-gray-900 dark:focus:ring-white",
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
          "border dark:text-white text-gray-900 hover:text-red-700 focus:text-red-700 dark:hover:text-red-700 dark:focus:text-red-700 hover:border-red-100 focus:border-red-100 hover:bg-red-100  focus:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset focus:ring-red-700",
      }),
    ],
    defaultVariants: {
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
        buttonClasses({ color, size, loading, disabled: props.disabled }),
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
          {size === "fab" ? (
            <>
              <StartIcon className="mr-2 hidden h-4 w-4 stroke-[1.5px] sm:inline-flex" />
              <Icon.FiPlus className="inline h-6 w-6 sm:hidden" />
            </>
          ) : (
            <StartIcon
              className={classNames(
                "inline-flex",
                size === "icon" ? "h-4 w-4 " : "mr-2 h-4 w-4 stroke-[1.5px]"
              )}
            />
          )}
        </>
      )}
      {size === "fab" ? <span className="hidden sm:inline">{props.children}</span> : props.children}
      {loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform">
          <svg
            className="mx-4 h-5 w-5 animate-spin text-black dark:text-white"
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
          {size === "fab" ? (
            <>
              <EndIcon className="-mr-1 hidden h-5 w-5 ltr:ml-2 rtl:mr-2 sm:inline" />
              <Icon.FiPlus className="inline h-6 w-6 sm:hidden" />
            </>
          ) : (
            <EndIcon className="-mr-1 inline h-5 w-5 ltr:ml-2 rtl:mr-2" />
          )}
        </>
      )}
    </>
  );

  return props.href ? (
    <Link passHref href={props.href} shallow={shallow && shallow}>
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
