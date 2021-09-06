import classNames from "@lib/classNames";
import Link, { LinkProps } from "next/link";
import React from "react";

type SVGComponent = React.FunctionComponent<React.SVGProps<SVGSVGElement>>;

export type ButtonProps = {
  color?: "primary" | "secondary" | "minimal" | "warn";
  size?: "base" | "sm" | "lg" | "fab";
  loading?: boolean;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  StartIcon?: SVGComponent;
  EndIcon?: SVGComponent;
} & (
  | (Omit<JSX.IntrinsicElements["a"], "href"> & { href: LinkProps["href"] })
  | (JSX.IntrinsicElements["button"] & { href?: never })
);

export const Button = function Button(props: ButtonProps) {
  const {
    loading = false,
    color = "primary",
    size = "base",
    StartIcon,
    EndIcon,
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
      className: classNames(
        // base styles independent what type of button it is
        "inline-flex items-center",
        // different styles depending on size
        size === "sm" && "px-3 py-2 text-sm leading-4 font-medium rounded-sm",
        size === "base" && "px-3 py-2 text-sm font-medium rounded-sm",
        size === "lg" && "px-4 py-2 text-base font-medium rounded-sm",
        // turn button into a floating action button (fab)
        size === "fab" ? "fixed" : "relative",
        size === "fab" && "justify-center bottom-20 right-8 rounded-full p-4 w-14 h-14",

        // different styles depending on color
        color === "primary" &&
          (disabled
            ? "border border-transparent bg-gray-400 text-white"
            : "border border-transparent text-white bg-neutral-900 hover:bg-neutral-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-neutral-900"),
        color === "secondary" &&
          (disabled
            ? "border border-gray-200 text-gray-400 bg-white"
            : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-neutral-900"),
        color === "minimal" &&
          (disabled
            ? "text-gray-400 bg-transparent"
            : "text-gray-700 bg-transparent hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:bg-gray-100 focus:ring-neutral-500"),
        color === "warn" &&
          (disabled
            ? "text-gray-400 bg-transparent"
            : "text-red-700 bg-transparent hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:bg-red-50 focus:ring-red-500"),
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
      {StartIcon && <StartIcon className="inline w-5 h-5 mr-2 -ml-1" />}
      {props.children}
      {loading && (
        <div className="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2">
          <svg
            className={classNames(
              "w-5 h-5 mx-4 animate-spin",
              color === "primary" ? "text-white" : "text-black"
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
      {EndIcon && <EndIcon className="inline w-5 h-5 ml-2 -mr-1" />}
    </>
  );
  return props.href ? (
    <Link passHref href={props.href}>
      {element}
    </Link>
  ) : (
    element
  );
};

export default Button;
