import Link, { LinkProps } from "next/link";
import React, { forwardRef, Fragment } from "react";
import { Icon } from "react-feather";

import classNames from "@calcom/lib/classNames";

import Tooltip from "./Tooltip";

export type ButtonBaseProps = {
  /* Primary: Signals most important actions at any given point in the application.
     Secondary: Gives visual weight to actions that are important
     Minimal: Used for actions that we want to give very little significane to */
  color?: "primary" | "secondary" | "minimal" | "destructive";
  /**Default: H = 36px (default)
     Large: H = 38px (Onboarding, modals)
     Icon: Makes the button be an icon button */
  size?: "base" | "lg" | "icon";
  /**Signals the button is loading */
  loading?: boolean;
  /** Disables the button from being clicked */
  disabled?: boolean;
  /** Action that happens when the button is clicked */
  onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  /**Left aligned icon*/
  StartIcon?: Icon;
  /**Right aligned icon */
  EndIcon?: Icon;
  shallow?: boolean;
  /**Tool tip used when icon size is set to small */
  tooltip?: string;
};
export type ButtonProps = ButtonBaseProps &
  (
    | (Omit<JSX.IntrinsicElements["a"], "href" | "onClick"> & { href: LinkProps["href"] })
    | (Omit<JSX.IntrinsicElements["button"], "onClick"> & { href?: never })
  );

export const Button = forwardRef<HTMLAnchorElement | HTMLButtonElement, ButtonProps>(function Button(
  props: ButtonProps,
  forwardedRef
) {
  const {
    loading = false,
    color = "primary",
    size = "base",
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
      ref: forwardedRef,
      className: classNames(
        // base styles independent what type of button it is
        "inline-flex items-center text-sm font-medium",
        // different styles depending on size
        size === "base" && "h-9 px-4 py-2.5 rounded-md ",
        size === "lg" && "h-[36px] px-4 py-2.5 rounded-md",
        size === "icon" && " p-2.5 h-[36px] w-[36px] rounded-md",

        // different styles depending on color
        color === "primary" &&
          (disabled
            ? "border border-transparent bg-brand-500 bg-opacity-20 text-white"
            : "border border-transparent text-white bg-brand-500 hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"),
        color === "secondary" &&
          (disabled
            ? "border border-gray-200 text-brand-900 bg-white opacity-30"
            : "border border-gray-200 text-brand-900 bg-white hover:bg-gray-100"),
        color === "minimal" &&
          (disabled
            ? "text-gray-400 bg-transparent"
            : "text-gray-700 bg-transparent hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:bg-gray-100 focus:ring-brand-900"),
        color === "destructive" &&
          (disabled
            ? "text-red-700 bg-transparent opacity-30"
            : "text-gray-700 bg-transparent hover:bg-red-100 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:bg-red-100 focus:ring-red-700"),
        // set not-allowed cursor if disabled
        loading ? "cursor-wait" : disabled ? "cursor-not-allowed" : "",
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
        <StartIcon
          className={classNames(
            "inline",
            size === "icon" ? "h-5 w-5 " : "-ml-1 h-5 w-5 ltr:mr-2 rtl:ml-2 rtl:-mr-1"
          )}
        />
      )}
      {props.children}
      {loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform">
          <svg
            className={classNames(
              "mx-4 h-5 w-5 animate-spin",
              color === "primary" ? "text-white dark:text-black" : "text-black"
            )}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      {EndIcon && <EndIcon className="-mr-1 inline h-5 w-5 ltr:ml-2 rtl:mr-2" />}
    </>
  );
  return props.href ? (
    <Link passHref href={props.href} shallow={shallow && shallow}>
      {element}
    </Link>
  ) : (
    element
  );
});

export default Button;
